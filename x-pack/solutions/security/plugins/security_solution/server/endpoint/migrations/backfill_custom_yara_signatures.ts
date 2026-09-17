/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Startup migration that backfills `custom_yara_signatures` on existing endpoint policies.
 *
 * This lives here rather than as a Fleet saved-object model-version backfill because the
 * experimental flag, serverless product feature, and license are unavailable during saved-object
 * migrations. Enabling a gated feature there would leak Custom YARA signatures to flag-off
 * clusters and serverless Endpoint Essentials deployments.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UpdatePackagePolicyWithId } from '@kbn/fleet-plugin/common';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { firstValueFrom } from 'rxjs';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { isAtLeast, type LicenseService } from '../../../common/license/license';
import type { PolicyConfig, PolicyData } from '../../../common/endpoint/types';
import { getPolicyDataForUpdate } from '../../../common/endpoint/service/policy';
import type { EndpointInternalFleetServicesInterface } from '../services/fleet';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';

const OS_KEYS = ['windows', 'mac', 'linux'] as const;

interface MemoryProtectionWithOptionalCys {
  mode?: string;
  custom_yara_signatures?: boolean;
}

const fillAbsentCustomYaraSignatures = (policyConfig: PolicyConfig): boolean => {
  let changed = false;

  for (const os of OS_KEYS) {
    const osConfig = policyConfig[os] as
      | { memory_protection?: MemoryProtectionWithOptionalCys }
      | undefined;
    const memoryProtection = osConfig?.memory_protection;
    if (memoryProtection && memoryProtection.custom_yara_signatures === undefined) {
      memoryProtection.custom_yara_signatures = memoryProtection.mode !== 'off';
      changed = true;
    }
  }

  return changed;
};

export const backfillCustomYaraSignatures = async (
  esClient: ElasticsearchClient,
  fleetServices: EndpointInternalFleetServicesInterface,
  productFeaturesService: ProductFeaturesService,
  licenseService: LicenseService,
  experimentalFeatures: ExperimentalFeatures,
  logger: Logger
): Promise<void> => {
  const log = logger.get('endpoint', 'customYaraSignaturesBackfill');

  if (!experimentalFeatures.customYaraSignaturesEnabled) {
    log.info(
      'Experimental flag [customYaraSignaturesEnabled] is disabled. Skipping custom YARA signatures backfill.'
    );
    return;
  }

  if (!productFeaturesService.isEnabled(ProductFeatureSecurityKey.endpointCustomYaraSignatures)) {
    log.info(
      `Product feature [${ProductFeatureSecurityKey.endpointCustomYaraSignatures}] is disabled. Skipping custom YARA signatures backfill.`
    );
    return;
  }

  const license$ = licenseService.getLicenseInformation$();
  if (!license$) {
    log.info('License information is not available. Skipping custom YARA signatures backfill.');
    return;
  }

  const license = await firstValueFrom(license$);
  if (!isAtLeast(license, 'enterprise')) {
    log.info('License is below Enterprise. Skipping custom YARA signatures backfill.');
    return;
  }

  const { packagePolicy, savedObjects, endpointPolicyKuery } = fleetServices;
  const internalSoClient = savedObjects.createInternalScopedSoClient({ readonly: false });
  const updates: UpdatePackagePolicyWithId[] = [];
  const messages: string[] = [];
  const perPage = 1000;
  let hasMoreData = true;
  let page = 1;

  while (hasMoreData) {
    const { items, total } = await packagePolicy.list(internalSoClient, {
      page,
      kuery: endpointPolicyKuery,
      perPage,
    });

    hasMoreData = page * perPage < total;
    page++;

    for (const item of items) {
      const integrationPolicy = item as PolicyData;
      const policySettings = integrationPolicy.inputs?.[0]?.config?.policy?.value;
      if (policySettings && fillAbsentCustomYaraSignatures(policySettings)) {
        messages.push(
          `Policy [${integrationPolicy.id}][${integrationPolicy.name}] backfilled custom_yara_signatures`
        );
        updates.push({
          ...getPolicyDataForUpdate(integrationPolicy),
          id: integrationPolicy.id,
        });
      }
    }
  }

  if (updates.length > 0) {
    log.info(
      `Found ${updates.length} policies that need custom YARA signatures backfill:\n${messages.join(
        '\n'
      )}`
    );
    const bulkUpdateResponse = await fleetServices.packagePolicy.bulkUpdate(
      internalSoClient,
      esClient,
      updates,
      { user: { username: 'elastic' } as AuthenticatedUser }
    );
    log.debug(() => `Bulk update response:\n${JSON.stringify(bulkUpdateResponse, null, 2)}`);
    if (bulkUpdateResponse.failedPolicies.length > 0) {
      log.error(
        `Done. ${bulkUpdateResponse.failedPolicies.length} out of ${
          updates.length
        } failed to update:\n${JSON.stringify(bulkUpdateResponse.failedPolicies, null, 2)}`
      );
    } else {
      log.info('Done. All updates applied successfully');
    }
  } else {
    log.info(`Done. Checked ${page * perPage} policies and no updates needed`);
  }
};
