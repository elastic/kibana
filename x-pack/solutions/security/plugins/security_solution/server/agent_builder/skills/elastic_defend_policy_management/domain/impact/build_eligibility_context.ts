/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import {
  policyFactoryWithoutPaidEnterpriseFeatures,
  policyFactoryWithSupportedFeatures,
} from '../../../../../../common/endpoint/models/policy_config';
import {
  ensureOnlyEventCollectionIsAllowed,
  removeCustomYaraSignatures,
  removeDeviceControl,
} from '../../../../../../common/endpoint/models/policy_config_helpers';
import type { PolicyConfig } from '../../../../../../common/endpoint/types';
import { unsetPolicyFeaturesAccordingToLicenseLevel } from '../../../../../../common/license/policy_config';
import type { EligibilityContext } from './policy_change_operation';

export interface BuildEligibilityContextInput {
  readonly proposedConfig: PolicyConfig;
  readonly licenseInformation: ILicense | null;
  readonly endpointPolicyProtections: boolean;
  readonly endpointTrustedDevices: boolean;
  readonly trustedDevicesExperimental: boolean;
  readonly endpointCustomYaraSignatures: boolean;
  readonly customYaraSignaturesExperimental: boolean;
  readonly endpointProtectionUpdates: boolean;
  readonly serverless: boolean;
}

export const buildEligibilityContext = ({
  proposedConfig,
  licenseInformation,
  endpointPolicyProtections,
  endpointTrustedDevices,
  trustedDevicesExperimental,
  endpointCustomYaraSignatures,
  customYaraSignaturesExperimental,
  endpointProtectionUpdates,
  serverless,
}: BuildEligibilityContextInput): EligibilityContext => {
  const supportedFeatures = policyFactoryWithSupportedFeatures(proposedConfig);

  return {
    proposedConfig,
    licenseStripped: unsetPolicyFeaturesAccordingToLicenseLevel(proposedConfig, licenseInformation),
    platinumStripped: policyFactoryWithoutPaidEnterpriseFeatures(supportedFeatures),
    enterpriseStripped: supportedFeatures,
    protectionsStripped: endpointPolicyProtections
      ? proposedConfig
      : ensureOnlyEventCollectionIsAllowed(structuredClone(proposedConfig)),
    deviceControlStripped:
      endpointTrustedDevices && trustedDevicesExperimental
        ? proposedConfig
        : removeDeviceControl(proposedConfig),
    deviceControlReason: endpointTrustedDevices
      ? 'trusted_devices_experimental_disabled'
      : 'endpoint_trusted_devices_disabled',
    customYaraSignaturesStripped:
      endpointCustomYaraSignatures && customYaraSignaturesExperimental
        ? proposedConfig
        : removeCustomYaraSignatures(proposedConfig),
    customYaraSignaturesReason: endpointCustomYaraSignatures
      ? 'custom_yara_signatures_experimental_disabled'
      : 'endpoint_custom_yara_signatures_disabled',
    endpointProtectionUpdates,
    serverless,
  };
};
