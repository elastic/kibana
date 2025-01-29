/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import { ALL_VALUE, CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
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
import { Duration, DurationUnit, SLODefinition } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SLOIdConflict, SecurityException } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import { SLORepository } from './slo_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getTransformQueryComposite } from './utils/get_transform_compite_query';

export class CreateSLO {
  constructor(
    private esClient: ElasticsearchClient,
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository,
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
      assertExpectedIndicatorSourceIndexPrivileges(slo, this.esClient),
    ]);

    const rollbackOperations = [];
    const createPromise = this.repository.create(slo);
    rollbackOperations.push(() => this.repository.deleteById(slo.id, true));

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      const sloPipelinePromise = this.createPipeline(getSLIPipelineTemplate(slo));
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

      rollbackOperations.push(() => this.transformManager.stop(rollupTransformId));
      rollbackOperations.push(() => this.summaryTransformManager.stop(summaryTransformId));

      // transforms can only be started after the pipeline is created

      await Promise.all([
        this.transformManager.start(rollupTransformId),
        this.summaryTransformManager.start(summaryTransformId),
      ]);
    } catch (err) {
      this.logger.error(
        `Cannot create the SLO [id: ${slo.id}, revision: ${slo.revision}]. Rolling back. ${err}`
      );

      await asyncForEach(rollbackOperations.reverse(), async (operation) => {
        try {
          await operation();
        } catch (rollbackErr) {
          this.logger.error(`Rollback operation failed. ${rollbackErr}`);
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
    const exists = await this.repository.exists(slo.id);
    if (exists) {
      throw new SLOIdConflict(`SLO [${slo.id}] already exists`);
    }
  }
  async createTempSummaryDocument(slo: SLODefinition) {
    return await retryTransientEsErrors(
      () =>
        this.esClient.index({
          index: SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
          refresh: true,
        }),
      { logger: this.logger }
    );
  }

  async deleteTempSummaryDocument(slo: SLODefinition) {
    return await retryTransientEsErrors(
      () =>
        this.esClient.delete({
          index: SUMMARY_TEMP_INDEX_NAME,
          id: `slo-${slo.id}`,
          refresh: true,
        }),
      { logger: this.logger }
    );
  }

  async createPipeline(params: IngestPutPipelineRequest) {
    return await retryTransientEsErrors(
      () => this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(params),
      { logger: this.logger }
    );
  }

  async deletePipeline(id: string) {
    return this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
      { id },
      { ignore: [404] }
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
    const rollUpPipeline = getSLIPipelineTemplate(slo);
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
      // @ts-expect-error there is some issue with deprecated types being used in es types
      rollUpTransformCompositeQuery: getTransformQueryComposite(rollUpTransform),
      // @ts-expect-error there is some issue with deprecated types being used in es types
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
