/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { Logger } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  isEndpointPolicyValidForLicense,
  unsetPolicyFeaturesAccordingToLicenseLevel,
} from '../../../../common/license/policy_config';
import type { LicenseService } from '../../../../common/license/license';
import type { PolicyData } from '../../../../common/endpoint/types';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

export class PolicyWatcher {
  private logger: Logger;
  private subscription: Subscription | undefined;

  constructor(private readonly endpointServices: EndpointAppContextService) {
    this.logger = endpointServices.createLogger('PolicyWatcher');
  }

  public start(licenseService: LicenseService) {
    this.subscription = licenseService.getLicenseInformation$()?.subscribe(this.watch.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  public async watch(license: ILicense) {
    const isSpacesEnabled =
      this.endpointServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled;
    const fleetServices = this.endpointServices.getInternalFleetServices();
    const esClient = this.endpointServices.getInternalEsClient();
    const soClient = isSpacesEnabled
      ? this.endpointServices.savedObjects.createInternalUnscopedSoClient(false)
      : this.endpointServices.savedObjects.createInternalScopedSoClient({ readonly: false });

    this.logger.debug(
      `Checking endpoint policies for compliance with license level [${license.type}]`
    );

    let totalUpdates = 0;
    let page = 1;
    let response: {
      items: PackagePolicy[];
      total: number;
      page: number;
      perPage: number;
    };
    do {
      try {
        response = await fleetServices.packagePolicy.list(soClient, {
          page: page++,
          perPage: 100,
          kuery: fleetServices.endpointPolicyKuery,
          spaceId: isSpacesEnabled ? '*' : undefined,
        });
      } catch (e) {
        this.logger.warn(
          `Unable to verify endpoint policies in line with license change: failed to fetch package policies: ${e.message}`
        );
        return;
      }

      this.logger.debug(
        () => `Processing page [${page - 1}] with [${response.items.length}] endpoint policies`
      );

      for (const policy of response.items as PolicyData[]) {
        const updatePolicy = getPolicyDataForUpdate(policy);
        const policyConfig = updatePolicy.inputs[0].config.policy.value;

        try {
          if (!isEndpointPolicyValidForLicense(policyConfig, license)) {
            this.logger.debug(
              `Endpoint policy [${policy.id}] needs updates in order to make it compliant with License [${license.type}]`
            );

            updatePolicy.inputs[0].config.policy.value = unsetPolicyFeaturesAccordingToLicenseLevel(
              policyConfig,
              license
            );

            const soClientForPolicyUpdate = isSpacesEnabled
              ? this.endpointServices.savedObjects.createInternalScopedSoClient({
                  spaceId: policy.spaceIds?.at(0) ?? DEFAULT_SPACE_ID,
                  readonly: false,
                })
              : soClient;

            try {
              await fleetServices.packagePolicy.update(
                soClientForPolicyUpdate,
                esClient,
                policy.id,
                updatePolicy
              );

              totalUpdates++;
            } catch (e) {
              // try again for transient issues
              this.logger.debug(
                `First attempt to update endpoint policy [${policy.id}] failed. Trying again. [ERROR: ${e.message}]`
              );
              try {
                await fleetServices.packagePolicy.update(
                  soClientForPolicyUpdate,
                  esClient,
                  policy.id,
                  updatePolicy
                );
                totalUpdates++;
              } catch (ee) {
                this.logger.warn(`Unable to remove platinum features from policy ${policy.id}`);
                this.logger.warn(ee);
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failure while attempting to verify Endpoint Policy features for policy [${policy.id}]`
          );
          this.logger.warn(error);
        }
      }
    } while (response.page * response.perPage < response.total);

    this.logger.debug(
      `Checks of endpoint policies for compliance with License [${license.type}] done.${
        totalUpdates > 0 ? ` [${totalUpdates}] policies were updated` : ''
      }`
    );
  }
}
