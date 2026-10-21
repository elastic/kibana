/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IBasePath, IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  SUMMARY_TEMP_INDEX_NAME,
  getSLOPipelineId,
  getSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../common/constants';
import { getSLIPipelineTemplate } from '../assets/ingest_templates/sli_pipeline_template';
import { getSummaryPipelineTemplate } from '../assets/ingest_templates/summary_pipeline_template';
import type { SLODefinition } from '../domain/models';
import { SecurityException, SLOOperationTimeout } from '../errors';
import { createDeadline } from '../utils/deadline';
import { REQUEST_RETRY_OPTIONS, retryTransientEsErrors } from '../utils/retry';
import { createTempSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import type { TransformManager } from './transform_manager';

// Forward + rollback deadlines stay below Kibana's default 120s server.socketTimeout
export const FORWARD_DEADLINE_MS = 60_000;
const ROLLBACK_DEADLINE_MS = 30_000;

type Operation = 'create' | 'update' | 'reset';

const LOG_CONTEXT: Record<Operation, { service: string; message: string; errorType: string }> = {
  create: {
    service: 'create_slo',
    message: 'Cannot create the SLO. Rolling back.',
    errorType: 'creation_failed',
  },
  update: {
    service: 'update_slo',
    message: 'Cannot update the SLO. Rolling back.',
    errorType: 'update_failed',
  },
  reset: {
    service: 'reset_slo',
    message: 'Cannot reset the SLO. Rolling back.',
    errorType: 'reset_failed',
  },
};

interface InstallOptions {
  signal: AbortSignal;
  operation: Operation;
  finalRollback?: () => Promise<unknown>;
}

export class SLOResourcesInstaller {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private transformManager: TransformManager,
    private summaryTransformManager: TransformManager,
    private logger: Logger,
    private spaceId: string,
    private basePath: IBasePath
  ) {}

  /**
   * Installs and starts the SLO pipelines, transforms and temporary summary document, rolling everything back on failure.
   */
  public async install(
    slo: SLODefinition,
    { signal, operation, finalRollback }: InstallOptions
  ): Promise<void> {
    const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
    const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);

    const failure =
      (await findFirstRejection([
        this.createPipeline(getSLIPipelineTemplate(slo, this.spaceId), signal),
        this.transformManager.install(slo, { signal }),
        this.createPipeline(getSummaryPipelineTemplate(slo, this.spaceId, this.basePath), signal),
        this.summaryTransformManager.install(slo, { signal }),
        this.createTempSummaryDocument(slo, signal),
      ])) ??
      // transforms can only be started after the related pipelines are created
      (await findFirstRejection([
        this.transformManager.start(rollupTransformId, { signal }),
        this.summaryTransformManager.start(summaryTransformId, { signal }),
      ]));

    if (!failure) {
      return;
    }

    const { service, message, errorType } = LOG_CONTEXT[operation];
    const labels = { slo_id: slo.id, indicator_type: slo.indicator.type };
    this.logger.warn(message, {
      service: { name: service },
      labels: { ...labels, error_type: errorType },
      error: failure.reason,
    });

    const timedOut = signal.aborted;
    await this.rollback(slo, service, labels, finalRollback);

    if (timedOut) {
      throw new SLOOperationTimeout(
        `Timed out while installing the resources of SLO [${slo.id}]. The changes have been rolled back.`
      );
    }

    const err = failure.reason;
    if (err.meta?.body?.error?.type === 'security_exception') {
      throw new SecurityException(err.meta.body.error.reason);
    }

    throw err;
  }

  private async rollback(
    slo: SLODefinition,
    service: string,
    labels: Record<string, string>,
    finalRollback?: () => Promise<unknown>
  ): Promise<void> {
    const { signal, clear } = createDeadline(ROLLBACK_DEADLINE_MS);
    const runStage = async (operations: Array<() => Promise<unknown>>) => {
      const results = await Promise.allSettled(operations.map((operation) => operation()));
      results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .forEach(({ reason }) => {
          this.logger.warn('Rollback operation failed.', {
            service: { name: service },
            labels: { ...labels, error_type: 'rollback_failed' },
            error: reason,
          });
        });
    };

    try {
      await runStage([
        () => this.transformManager.uninstall(getSLOTransformId(slo.id, slo.revision), { signal }),
        () =>
          this.summaryTransformManager.uninstall(getSLOSummaryTransformId(slo.id, slo.revision), {
            signal,
          }),
        () => this.deleteTempSummaryDocument(slo, signal),
      ]);
      await runStage([
        () => this.deletePipeline(getSLOPipelineId(slo.id, slo.revision), signal),
        () => this.deletePipeline(getSLOSummaryPipelineId(slo.id, slo.revision), signal),
      ]);
      if (finalRollback) {
        await runStage([finalRollback]);
      }
    } finally {
      clear();
    }
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
          { index: SUMMARY_TEMP_INDEX_NAME, id: `slo-${slo.id}`, refresh: true },
          { ignore: [404], signal }
        ),
      { logger: this.logger, retryOptions: REQUEST_RETRY_OPTIONS, signal }
    );
  }
}

const findFirstRejection = async (
  operations: Array<Promise<unknown>>
): Promise<PromiseRejectedResult | undefined> => {
  const results = await Promise.allSettled(operations);
  return results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
};
