/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { PackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import pRetry from 'p-retry';
import type { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
import type { PolicyData } from '../../../../common/endpoint/types';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { stringify } from '../../utils/stringify';

interface TelemetryConfigWatcherOptions {
  /** Retry SO operations immediately, without any delay. Useful for testing.
   */
  immediateRetry: boolean;
}

export class TelemetryConfigWatcher {
  private logger: Logger;
  private esClient: ElasticsearchClient;
  private policyService: PackagePolicyClient;
  private endpointAppContextService: EndpointAppContextService;
  private subscription: Subscription | undefined;
  private retryOptions: Partial<pRetry.Options>;

  constructor(
    policyService: PackagePolicyClient,
    esStart: ElasticsearchServiceStart,
    endpointAppContextService: EndpointAppContextService,
    options: TelemetryConfigWatcherOptions = { immediateRetry: false }
  ) {
    this.policyService = policyService;
    this.esClient = esStart.client.asInternalUser;
    this.endpointAppContextService = endpointAppContextService;
    this.logger = endpointAppContextService.createLogger(this.constructor.name);

    this.retryOptions = {
      retries: 4,
      minTimeout: options.immediateRetry ? 0 : 1000,
    };
  }

  /**
   * The policy watcher is not called as part of a HTTP request chain, where the
   * request-scoped SOClient could be passed down. It is called via telemetry observable
   * changes. We are acting as the 'system' in response to telemetry changes, so we are
   * intentionally using the system user here. Be very aware of what you are using this
   * client to do
   */
  private makeInternalSOClient(): SavedObjectsClientContract {
    return this.endpointAppContextService.savedObjects.createInternalUnscopedSoClient(false);
  }

  public start(telemetryConfigProvider: TelemetryConfigProvider) {
    this.subscription = telemetryConfigProvider.getObservable()?.subscribe(this.watch.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public async watch(isTelemetryEnabled: boolean) {
    let page = 1;
    let response: {
      items: PackagePolicy[];
      total: number;
      page: number;
      perPage: number;
    };
    let updated = 0;
    let failed = 0;

    this.logger.debug(
      `Checking Endpoint policies to update due to changed global telemetry config setting. (New value: ${isTelemetryEnabled})`
    );

    do {
      try {
        response = await pRetry(
          () =>
            this.policyService.list(this.makeInternalSOClient(), {
              page,
              perPage: 100,
              kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
            }),
          {
            onFailedAttempt: (error) =>
              this.logger.debug(
                `Failed to read package policies on ${
                  error.attemptNumber
                }. attempt on page ${page}, reason: ${stringify(error)}`
              ),
            ...this.retryOptions,
          }
        );
      } catch (e) {
        this.logger.warn(
          `Unable to verify endpoint policies in line with telemetry change: failed to fetch package policies: ${stringify(
            e
          )}`
        );
        return;
      }

      const updates: UpdatePackagePolicy[] = [];
      for (const policy of response.items as PolicyData[]) {
        const updatePolicy = getPolicyDataForUpdate(policy);
        const policyConfig = updatePolicy.inputs[0].config.policy.value;

        if (isTelemetryEnabled !== policyConfig.global_telemetry_enabled) {
          policyConfig.global_telemetry_enabled = isTelemetryEnabled;

          updates.push({ ...updatePolicy, id: policy.id });
        }
      }

      if (updates.length) {
        try {
          const updateResult = await pRetry(
            () =>
              this.policyService.bulkUpdate(this.makeInternalSOClient(), this.esClient, updates),
            {
              onFailedAttempt: (error) =>
                this.logger.debug(
                  `Failed to bulk update package policies on ${
                    error.attemptNumber
                  }. attempt, reason: ${stringify(error)}`
                ),
              ...this.retryOptions,
            }
          );

          if (updateResult.failedPolicies.length) {
            this.logger.warn(
              `Cannot update telemetry flag in the following policies:\n${updateResult.failedPolicies
                .map((entry) => `- id: ${entry.packagePolicy.id}, error: ${stringify(entry.error)}`)
                .join('\n')}`
            );
          }

          updated += updateResult.updatedPolicies?.length ?? 0;
          failed += updateResult.failedPolicies.length;
        } catch (e) {
          this.logger.warn(
            `Unable to update telemetry config state to ${isTelemetryEnabled} in policies: ${updates.map(
              (update) => update.id
            )}\n\n${stringify(e)}`
          );

          failed += updates.length;
        }
      }

      page++;
    } while (response.page * response.perPage < response.total);

    this.logger.info(
      `Finished updating global_telemetry_enabled flag to ${isTelemetryEnabled} in Defend package policies: ${updated} succeeded, ${failed} failed.`
    );
  }
}
