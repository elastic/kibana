/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IndicatorTypes, SLODefinition } from '../domain/models';
import { SecurityException } from '../errors';
import type { RetryOptions } from '../utils/retry';
import { ignoreAlreadyExistsAfterAmbiguousFailure, retryTransientEsErrors } from '../utils/retry';
import type { TransformGenerator } from './transform_generators';

type TransformId = string;

export interface TransformManagerOptions {
  retryOptions?: RetryOptions;
}

export interface TransformCallOptions {
  signal: AbortSignal;
}

export interface TransformManager {
  install(slo: SLODefinition, options: TransformCallOptions): Promise<TransformId>;
  inspect(slo: SLODefinition): Promise<TransformPutTransformRequest>;
  preview(transformId: TransformId, options: TransformCallOptions): Promise<void>;
  start(transformId: TransformId, options: TransformCallOptions): Promise<void>;
  stop(transformId: TransformId, options: TransformCallOptions): Promise<void>;
  uninstall(transformId: TransformId, options: TransformCallOptions): Promise<void>;
  getVersion(transformId: TransformId, options: TransformCallOptions): Promise<number | undefined>;
}

export class DefaultTransformManager implements TransformManager {
  constructor(
    private generators: Record<IndicatorTypes, TransformGenerator>,
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger,
    private readonly options: TransformManagerOptions = {}
  ) {}

  async install(slo: SLODefinition, { signal }: TransformCallOptions): Promise<TransformId> {
    const generator = this.generators[slo.indicator.type];
    if (!generator) {
      this.logger.debug('No transform generator found for indicator type.', {
        service: { name: 'transform_manager' },
        labels: {
          slo_id: slo.id,
          indicator_type: slo.indicator.type,
          error_type: 'unsupported_indicator_type',
        },
      });
      throw new Error(`Unsupported indicator type [${slo.indicator.type}]`);
    }

    const transformParams = await generator.getTransformParams(slo);
    try {
      await retryTransientEsErrors(
        ignoreAlreadyExistsAfterAmbiguousFailure(() =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.putTransform(transformParams, {
            signal,
          })
        ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );
    } catch (err) {
      this.logger.warn('Cannot install SLO transform.', {
        service: { name: 'transform_manager' },
        labels: {
          slo_id: slo.id,
          indicator_type: slo.indicator.type,
          error_type: 'transform_install_failed',
        },
        error: err,
      });
      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    return transformParams.transform_id;
  }

  async inspect(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    const generator = this.generators[slo.indicator.type];
    if (!generator) {
      this.logger.debug(`No transform generator found for indicator type [${slo.indicator.type}]`);
      throw new Error(`Unsupported indicator type [${slo.indicator.type}]`);
    }

    return await generator.getTransformParams(slo);
  }

  async preview(transformId: string, { signal }: TransformCallOptions): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.previewTransform(
            { transform_id: transformId },
            { signal }
          ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );
    } catch (err) {
      this.logger.warn('Cannot preview SLO transform.', {
        service: { name: 'transform_manager' },
        labels: { transform_id: transformId, error_type: 'transform_preview_failed' },
        error: err,
      });
      throw err;
    }
  }

  async start(transformId: TransformId, { signal }: TransformCallOptions): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.startTransform(
            { transform_id: transformId },
            { ignore: [409], signal }
          ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );
      await this.scheduleNowTransform(transformId, signal);
    } catch (err) {
      this.logger.warn('Cannot start SLO transform.', {
        service: { name: 'transform_manager' },
        labels: { transform_id: transformId, error_type: 'transform_start_failed' },
        error: err,
      });
      throw err;
    }
  }

  async stop(transformId: TransformId, { signal }: TransformCallOptions): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.stopTransform(
            {
              transform_id: transformId,
              wait_for_completion: true,
              force: true,
              allow_no_match: true,
            },
            { ignore: [404], signal }
          ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );
    } catch (err) {
      this.logger.warn('Cannot stop SLO transform.', {
        service: { name: 'transform_manager' },
        labels: { transform_id: transformId, error_type: 'transform_stop_failed' },
        error: err,
      });
      throw err;
    }
  }

  async uninstall(transformId: TransformId, { signal }: TransformCallOptions): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.deleteTransform(
            { transform_id: transformId, force: true },
            { ignore: [404], signal }
          ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );
    } catch (err) {
      this.logger.warn('Cannot uninstall SLO transform.', {
        service: { name: 'transform_manager' },
        labels: { transform_id: transformId, error_type: 'transform_uninstall_failed' },
        error: err,
      });
      throw err;
    }
  }

  async getVersion(
    transformId: TransformId,
    { signal }: TransformCallOptions
  ): Promise<number | undefined> {
    try {
      const response = await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.getTransform(
            { transform_id: transformId },
            { signal }
          ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );

      if (response.count === 0) {
        return undefined;
      }

      return response.transforms[0]._meta?.version;
    } catch (err) {
      if (err.meta?.body?.error?.type === 'resource_not_found_exception') {
        return undefined;
      }

      this.logger.warn('Cannot retrieve SLO transform version.', {
        service: { name: 'transform_manager' },
        labels: { transform_id: transformId, error_type: 'transform_get_version_failed' },
        error: err,
      });
      throw err;
    }
  }

  private async scheduleNowTransform(transformId: TransformId, signal: AbortSignal) {
    this.scopedClusterClient.asSecondaryAuthUser.transform
      .scheduleNowTransform({ transform_id: transformId }, { signal })
      .then(() => {
        this.logger.debug(`SLO transform [${transformId}] scheduled now successfully`);
      })
      .catch((e) => {
        this.logger.warn('Cannot schedule now SLO transform.', {
          service: { name: 'transform_manager' },
          labels: { transform_id: transformId, error_type: 'transform_schedule_failed' },
          error: e,
        });
      });
  }
}
