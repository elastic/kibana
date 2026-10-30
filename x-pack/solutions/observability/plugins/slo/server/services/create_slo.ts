/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  IngestPutPipelineRequest,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
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
import type { SLODefinition, StoredSLODefinition } from '../domain/models';
import { Duration, DurationUnit } from '../domain/models';
import { validateSLO } from '../domain/services';
import { SLOIdConflict, SecurityException } from '../errors';
import type { SloTelemetryReporter } from '../lib/telemetry';
import { SLO_CREATED_EBT_EVENT_TYPE, toSloDefinitionEbtData } from '../lib/telemetry';
import { SO_SLO_TYPE } from '../saved_objects';
import { allSettledOrThrow } from '../utils/all_settled_or_throw';
import { REQUEST_RETRY_OPTIONS, retryTransientEsErrors } from '../utils/retry';
import type { RollbackOperation } from '../utils/run_rollback';
import { runRollback } from '../utils/run_rollback';
import { REQUEST_DEADLINE_MS, withDeadline } from '../utils/with_deadline';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import type { TransformManager } from './transform_manager';
import { assertExpectedIndicatorSourceIndexPrivileges } from './utils/assert_expected_indicator_source_index_privileges';
import { getTransformQueryComposite } from './utils/get_transform_compite_query';
import { getSloApmLabels } from './utils';

export class CreateSLO {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLODefinitionRepository,
    private internalSOClient: SavedObjectsClientContract,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath,
    private username: string,
    private telemetry: SloTelemetryReporter
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    return withDeadline(REQUEST_DEADLINE_MS, (signal) => this.create(params, signal));
  }

  private async create(params: CreateSLOParams, signal: AbortSignal): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    addTransactionLabels(getSloApmLabels(slo));
    validateSLO(slo);

    await Promise.all([
      this.assertSLOInexistant(slo),
      assertExpectedIndicatorSourceIndexPrivileges(slo, this.scopedClusterClient.asCurrentUser, {
        signal,
      }),
    ]);

    const rollbackOperations: RollbackOperation[] = [];
    const createPromise = this.repository.create(slo);

    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);
    try {
      const sloPipelinePromise = this.createPipeline(
        getSLIPipelineTemplate(slo, this.spaceId),
        signal
      );
      rollbackOperations.push((rollbackSignal) =>
        this.deletePipeline(getSLOPipelineId(slo.id, slo.revision), rollbackSignal)
      );

      const rollupTransformPromise = this.transformManager.install(slo, { signal });
      rollbackOperations.push((rollbackSignal) =>
        this.transformManager.uninstall(rollupTransformId, { signal: rollbackSignal })
      );

      const summaryPipelinePromise = this.createPipeline(
        getSummaryPipelineTemplate(slo, this.spaceId, this.basePath),
        signal
      );
      rollbackOperations.push((rollbackSignal) =>
        this.deletePipeline(getSLOSummaryPipelineId(slo.id, slo.revision), rollbackSignal)
      );

      const summaryTransformPromise = this.summaryTransformManager.install(slo, { signal });
      rollbackOperations.push((rollbackSignal) =>
        this.summaryTransformManager.uninstall(summaryTransformId, { signal: rollbackSignal })
      );

      const tempDocPromise = this.createTempSummaryDocument(slo, signal);
      rollbackOperations.push((rollbackSignal) =>
        this.deleteTempSummaryDocument(slo, rollbackSignal)
      );

      await allSettledOrThrow([
        createPromise,
        sloPipelinePromise,
        rollupTransformPromise,
        summaryPipelinePromise,
        summaryTransformPromise,
        tempDocPromise,
      ]);

      // transforms can only be started after the related pipelines are created
      await allSettledOrThrow([
        this.transformManager.start(rollupTransformId, { signal }),
        this.summaryTransformManager.start(summaryTransformId, { signal }),
      ]);
    } catch (err) {
      this.logger.warn('Cannot create the SLO. Rolling back.', {
        service: { name: 'create_slo' },
        labels: {
          slo_id: slo.id,
          indicator_type: slo.indicator.type,
          error_type: 'creation_failed',
        },
        error: err,
      });

      await runRollback({
        operations: rollbackOperations,
        finalOperation: () => this.repository.deleteById(slo.id, { ignoreNotFound: true }),
        onError: (rollbackErr) => {
          this.logger.warn('Rollback operation failed.', {
            service: { name: 'create_slo' },
            labels: {
              slo_id: slo.id,
              indicator_type: slo.indicator.type,
              error_type: 'rollback_failed',
            },
            error: rollbackErr,
          });
        },
      });

      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    this.telemetry.report(SLO_CREATED_EBT_EVENT_TYPE, () => toSloDefinitionEbtData(slo));

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

  private async createTempSummaryDocument(slo: SLODefinition, signal: AbortSignal) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.index(
          {
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            document: createTempSummaryDocument(slo, this.spaceId, this.basePath),
            refresh: true,
          },
          { signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  private async deleteTempSummaryDocument(slo: SLODefinition, signal: AbortSignal) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asCurrentUser.delete(
          {
            index: SUMMARY_TEMP_INDEX_NAME,
            id: `slo-${slo.id}`,
            refresh: true,
          },
          { ignore: [404], signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  private async createPipeline(params: IngestPutPipelineRequest, signal: AbortSignal) {
    return retryTransientEsErrors(
      () => this.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline(params, { signal }),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }

  private async deletePipeline(id: string, signal: AbortSignal) {
    return retryTransientEsErrors(
      () =>
        this.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
          { id },
          { ignore: [404], signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
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
