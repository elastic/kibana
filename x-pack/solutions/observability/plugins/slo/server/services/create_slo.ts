/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type {
  IBasePath,
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { addTransactionLabels } from '@kbn/apm-utils';
import type { CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import type { SLODefinition, StoredSLODefinition } from '../domain/models';
import { Duration, DurationUnit } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SLOIdConflict } from '../errors';
import { SO_SLO_TYPE } from '../saved_objects';
import { createDeadline } from '../utils/deadline';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { FORWARD_DEADLINE_MS, SLOResourcesInstaller } from './slo_resources_installer';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import type { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getTransformQueryComposite } from './utils/get_transform_compite_query';
import { getSloApmLabels } from './utils';

export class CreateSLO {
  private resourcesInstaller: SLOResourcesInstaller;

  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository,
    private internalSOClient: SavedObjectsClientContract,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    logger: Logger,
    private spaceId: string,
    private basePath: IBasePath,
    private username: string
  ) {
    this.resourcesInstaller = new SLOResourcesInstaller(
      scopedClusterClient,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );
  }

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    addTransactionLabels(getSloApmLabels(slo));
    validateSLO(slo);

    const { signal, clear } = createDeadline(FORWARD_DEADLINE_MS);
    try {
      await Promise.all([
        this.assertSLOInexistant(slo),
        assertExpectedIndicatorSourceIndexPrivileges(slo, this.scopedClusterClient.asCurrentUser, {
          signal,
        }),
      ]);

      await this.repository.create(slo);

      await this.resourcesInstaller.install(slo, {
        signal,
        operation: 'create',
        finalRollback: () => this.repository.deleteById(slo.id, { ignoreNotFound: true }),
      });
    } finally {
      clear();
    }

    return this.toResponse(slo);
  }

  private async assertSLOInexistant(slo: SLODefinition) {
    const findResponse = await this.internalSOClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      perPage: 0,
      filter: `slo.attributes.id:(${slo.id})`,
      namespaces: [ALL_SPACES_ID],
    });

    const exists = findResponse.total > 0;

    if (exists) {
      throw new SLOIdConflict(`SLO [${slo.id}] already exists`);
    }
  }

  public async inspect(params: CreateSLOParams): Promise<{
    slo: CreateSLOParams;
    rollUpPipeline: Record<string, any>;
    summaryPipeline: Record<string, any>;
    rollUpTransform: TransformPutTransformRequest;
    summaryTransform: TransformPutTransformRequest;
    temporaryDoc: Record<string, any>;
    rollUpTransformCompositeQuery: string;
    summaryTransformCompositeQuery: string;
  }> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    const rollUpTransform = await this.transformManager.inspect(slo);
    const rollUpPipeline = getSLIPipelineTemplate(slo, this.spaceId);
    const summaryPipeline = getSummaryPipelineTemplate(slo, this.spaceId, this.basePath);
    const summaryTransform = await this.summaryTransformManager.inspect(slo);
    const temporaryDoc = createTempSummaryDocument(slo, this.spaceId, this.basePath);

    return {
      slo,
      rollUpPipeline,
      summaryPipeline,
      temporaryDoc,
      summaryTransform,
      rollUpTransform,
      rollUpTransformCompositeQuery: getTransformQueryComposite(rollUpTransform),
      summaryTransformCompositeQuery: getTransformQueryComposite(summaryTransform),
    };
  }

  private toSLO(params: CreateSLOParams): SLODefinition {
    const now = new Date();
    return {
      ...params,
      id: params.id ?? uuidv4(),
      settings: merge(
        {
          syncDelay: new Duration(1, DurationUnit.Minute),
          frequency: new Duration(1, DurationUnit.Minute),
          preventInitialBackfill: false,
        },
        params.settings
      ),
      revision: params.revision ?? 1,
      enabled: true,
      tags: params.tags ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy: this.username,
      updatedBy: this.username,
      groupBy: !!params.groupBy ? params.groupBy : ALL_VALUE,
      version: SLO_MODEL_VERSION,
    };
  }

  private toResponse(slo: SLODefinition): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
