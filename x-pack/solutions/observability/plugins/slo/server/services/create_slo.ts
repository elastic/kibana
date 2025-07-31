/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  IngestPutPipelineRequest,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import {
  IBasePath,
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { asyncForEach } from '@kbn/std';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  SLO_MODEL_VERSION,
  SUMMARY_TEMP_INDEX_NAME,
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import { Duration, DurationUnit, SLODefinition, StoredSLODefinition } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SLOIdConflict, SecurityException } from '../errors';
import { SO_SLO_TYPE } from '../saved_objects';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getTransformQueryComposite } from './utils/get_transform_compite_query';

export class CreateSLO {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository,
    private internalSOClient: SavedObjectsClientContract,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath,
    private username: string
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

    await Promise.all([
      this.assertSLOInexistant(slo),
      assertExpectedIndicatorSourceIndexPrivileges(slo, this.scopedClusterClient.asCurrentUser),
    ]);

    const rollbackOperations = [];
    const createPromise = this.repository.create(slo);
    rollbackOperations.push(() => this.repository.deleteById(slo.id, { ignoreNotFound: true }));

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      const sloPipelinePromise = this.createPipeline(getSLIPipelineTemplate(slo, this.spaceId));
      rollbackOperations.push(() => this.deletePipeline(getSLOPipelineId(slo.id, slo.revision)));

      const rollupTransformPromise = this.transformManager.install(slo);
      rollbackOperations.push(() => this.transformManager.uninstall(rollupTransformId));

      const summaryPipelinePromise = this.createPipeline(
        getSummaryPipelineTemplate(slo, this.spaceId, this.basePath)
      );
      rollbackOperations.push(() =>
        this.deletePipeline(getSLOSummaryPipelineId(slo.id, slo.revision))
      );

      const summaryTransformPromise = this.summaryTransformManager.install(slo);
      rollbackOperations.push(() => this.summaryTransformManager.uninstall(summaryTransformId));

      const tempDocPromise = this.createTempSummaryDocument(slo);
      rollbackOperations.push(() => this.deleteTempSummaryDocument(slo));

      await Promise.all([
        createPromise,
        sloPipelinePromise,
        rollupTransformPromise,
        summaryPipelinePromise,
        summaryTransformPromise,
        tempDocPromise,
      ]);

      // transforms can only be started after the related pipelines are created
      await Promise.all([
        this.transformManager.start(rollupTransformId),
        this.summaryTransformManager.start(summaryTransformId),
      ]);
    } catch (err) {
      this.logger.debug(
        `Cannot create the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back. ${err}`
      );

      await asyncForEach(rollbackOperations.reverse(), async (operation) => {
        try {
          await operation();
        } catch (rollbackErr) {
          this.logger.debug(`Rollback operation failed. ${rollbackErr}`);
        }
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
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

  private async createTempSummaryDocument(slo: SLODefinition) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.index({
          index: SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
          refresh: true,
        }),
      { logger: this.logger }
    );
  }

  private async deleteTempSummaryDocument(slo: SLODefinition) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.delete({
          index: SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          refresh: true,
        }),
      { logger: this.logger }
    );
  }

  private async createPipeline(params: IngestPutPipelineRequest) {
    return retryTransientEsErrors(
      () => this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(params),
      { logger: this.logger }
    );
  }

  private async deletePipeline(id: string) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id },
          { ignore: [404] }
        ),
      { logger: this.logger }
    );
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
