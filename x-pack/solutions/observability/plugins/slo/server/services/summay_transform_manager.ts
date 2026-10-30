/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SLODefinition } from '../domain/models';
import { SecurityException } from '../errors';
import { ignoreAlreadyExistsAfterAmbiguousFailure, retryTransientEsErrors } from '../utils/retry';
import type { SummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import type {
  TransformCallOptions,
  TransformManager,
  TransformManagerOptions,
} from './transform_manager';

type TransformId = string;

export class DefaultSummaryTransformManager implements TransformManager {
  constructor(
    private generator: SummaryTransformGenerator,
    private scopedClusterClient: IScopedClusterClient,
    private logger: Logger,
    private readonly options: TransformManagerOptions = {}
  ) {}

  async install(slo: SLODefinition, { signal }: TransformCallOptions): Promise<TransformId> {
    const transformParams = await this.generator.generate(slo);
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
      this.logger.debug(`Cannot create summary transform for SLO [${slo.id}]. ${err}`);
      if (err.meta?.body?.error?.type === 'security_exception') {
        throw new SecurityException(err.meta.body.error.reason);
      }

      throw err;
    }

    return transformParams.transform_id;
  }

  async inspect(slo: SLODefinition): Promise<TransformPutTransformRequest> {
    return this.generator.generate(slo);
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
      this.logger.debug(`Cannot preview SLO summary transform [${transformId}]. ${err}`);
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
    } catch (err) {
      this.logger.debug(`Cannot start SLO summary transform [${transformId}]. ${err}`);
      throw err;
    }
  }

  async stop(transformId: TransformId, { signal }: TransformCallOptions): Promise<void> {
    try {
      await retryTransientEsErrors(
        () =>
          this.scopedClusterClient.asSecondaryAuthUser.transform.stopTransform(
            { transform_id: transformId, wait_for_completion: true, force: true },
            { ignore: [404], signal }
          ),
        { logger: this.logger, retryOptions: this.options.retryOptions, signal }
      );
    } catch (err) {
      this.logger.debug(`Cannot stop SLO summary transform [${transformId}]. ${err}`);
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
      this.logger.debug(`Cannot delete SLO summary transform [${transformId}]. ${err}`);
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

      this.logger.debug(`Cannot retrieve SLO transform version [${transformId}]. ${err}`);
      throw err;
    }
  }
}
