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
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { PackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { TelemetryConfigProvider } from '../../../../common/telemetry_config/telemetry_config_provider';
import type { PolicyData } from '../../../../common/endpoint/types';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

export class TelemetryConfigWatcher {
  private logger: Logger;
  private esClient: ElasticsearchClient;
  private policyService: PackagePolicyClient;
  private subscription: Subscription | undefined;
  private soStart: SavedObjectsServiceStart;
  constructor(
    policyService: PackagePolicyClient,
    soStart: SavedObjectsServiceStart,
    esStart: ElasticsearchServiceStart,
    endpointAppContextService: EndpointAppContextService
  ) {
    this.policyService = policyService;
    this.esClient = esStart.client.asInternalUser;
    this.logger = endpointAppContextService.createLogger(this.constructor.name);
    this.soStart = soStart;
  }

  /**
   * The policy watcher is not called as part of a HTTP request chain, where the
   * request-scoped SOClient could be passed down. It is called via telemetry observable
   * changes. We are acting as the 'system' in response to telemetry changes, so we are
   * intentionally using the system user here. Be very aware of what you are using this
   * client to do
   */
  private makeInternalSOClient(soStart: SavedObjectsServiceStart): SavedObjectsClientContract {
    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;
    return soStart.getScopedClient(fakeRequest, { excludedExtensions: [SECURITY_EXTENSION_ID] });
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

    this.logger.debug(
      `Checking Endpoint policies to update due to changed global telemetry config setting. (New value: ${isTelemetryEnabled})`
    );

    do {
      try {
        response = await this.policyService.list(this.makeInternalSOClient(this.soStart), {
          page: page++,
          perPage: 100,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        });
      } catch (e) {
        this.logger.warn(
          `Unable to verify endpoint policies in line with telemetry change: failed to fetch package policies: ${e.message}`
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
          await this.policyService.bulkUpdate(
            this.makeInternalSOClient(this.soStart),
            this.esClient,
            updates
          );
        } catch (e) {
          // try again for transient issues
          try {
            await this.policyService.bulkUpdate(
              this.makeInternalSOClient(this.soStart),
              this.esClient,
              updates
            );
          } catch (ee) {
            this.logger.warn(
              `Unable to update telemetry config state to ${isTelemetryEnabled} in policies: ${updates.map(
                (update) => update.id
              )}`
            );
            this.logger.warn(ee);
          }
        }
      }
    } while (response.page * response.perPage < response.total);
  }
}
