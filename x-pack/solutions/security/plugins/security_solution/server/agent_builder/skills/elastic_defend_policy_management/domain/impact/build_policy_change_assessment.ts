/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  checkIfPopupMessagesContainCustomNotifications,
  getDeviceControlNotificationConflicts,
  getPolicyProtectionsReference,
} from '../../../../../../common/endpoint/models/policy_config_helpers';
import { POLICY_PROTECTION_FAMILY_TITLES } from '../../../../../../common/endpoint/models/policy_settings_ui_labels';
import { isEndpointPolicyValidForLicense } from '../../../../../../common/license/policy_config';
import {
  GLOBAL_MANIFEST_VERSION_OUTDATED_DAYS,
  classifyGlobalManifestVersion,
  getGlobalManifestVersionAgeDays,
} from '../../../../../../common/endpoint/utils/global_manifest_version';
import {
  ProtectionModes,
  PolicyOperatingSystem,
  type PolicyConfig,
} from '../../../../../../common/endpoint/types';
import { getFieldRegistry, getFieldRegistryEntry } from '../field_registry';
import { normalize } from '../normalize_policy_config';
import type { NormalizedEndpointPolicy } from '../normalized_endpoint_policy';
import type { BuildEligibilityContextInput } from './build_eligibility_context';
import { buildEligibilityContext } from './build_eligibility_context';
import { computeGlobalManifestBlockers, computePathEligibility } from './compute_path_eligibility';
import { POLICY_CHANGE_PROTECTIONS } from './policy_change_operation';
import type {
  EligibilityContext,
  ExplicitPolicyChange,
  PolicyAssessmentAdvisory,
  PolicyChangeAssessment,
  PolicyChangeFact,
  PolicyChangeOperation,
  PolicyChangeProtection,
} from './policy_change_operation';
import { prepareChangeSet } from './prepare_change_set';

export type PolicyChangeCapabilities = Omit<BuildEligibilityContextInput, 'proposedConfig'> & {
  readonly endpointCustomNotification: boolean;
};

const ADVISORY_OS_ORDER: readonly PolicyOperatingSystem[] = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

const ADVISORY_OS_TITLES: Readonly<Record<PolicyOperatingSystem, string>> = {
  [PolicyOperatingSystem.windows]: 'Windows',
  [PolicyOperatingSystem.mac]: 'macOS',
  [PolicyOperatingSystem.linux]: 'Linux',
};

const PROTECTION_MODE_STRENGTH: Readonly<Record<ProtectionModes, number>> = {
  [ProtectionModes.prevent]: 2,
  [ProtectionModes.detect]: 1,
  [ProtectionModes.off]: 0,
};

const isProtectionMode = (value: unknown): value is ProtectionModes =>
  value === ProtectionModes.prevent ||
  value === ProtectionModes.detect ||
  value === ProtectionModes.off;

const protectionWeakenedText = (
  protection: PolicyChangeProtection,
  os: readonly PolicyOperatingSystem[],
  to: 'detect' | 'off'
): string => {
  const oses = os.map((entry) => ADVISORY_OS_TITLES[entry]).join(', ');
  const family = POLICY_PROTECTION_FAMILY_TITLES[protection];
  return to === ProtectionModes.detect
    ? `${family} protection on ${oses} changes to Detect: this protection generates alerts but does not block threats.`
    : `${family} protection on ${oses} is turned off: this protection no longer detects or blocks threats.`;
};

const buildProtectionWeakenedAdvisories = (
  currentConfig: PolicyConfig,
  proposedConfig: PolicyConfig
): readonly PolicyAssessmentAdvisory[] =>
  POLICY_CHANGE_PROTECTIONS.flatMap((protection) => {
    const reference = getPolicyProtectionsReference().find(
      ({ keyPath }) => keyPath === `${protection}.mode`
    );
    if (reference === undefined) {
      return [];
    }

    const decreasedToDetect: PolicyOperatingSystem[] = [];
    const decreasedToOff: PolicyOperatingSystem[] = [];
    for (const os of ADVISORY_OS_ORDER) {
      const from = get(currentConfig, `${os}.${protection}.mode`);
      const to = get(proposedConfig, `${os}.${protection}.mode`);
      if (
        reference.osList.includes(os) &&
        isProtectionMode(from) &&
        isProtectionMode(to) &&
        PROTECTION_MODE_STRENGTH[from] > PROTECTION_MODE_STRENGTH[to]
      ) {
        if (to === ProtectionModes.detect) {
          decreasedToDetect.push(os);
        } else if (to === ProtectionModes.off) {
          decreasedToOff.push(os);
        }
      }
    }

    return [
      ...(decreasedToDetect.length > 0
        ? [
            {
              code: 'protection_weakened' as const,
              protection,
              os: decreasedToDetect,
              to: 'detect' as const,
              text: protectionWeakenedText(protection, decreasedToDetect, 'detect'),
            },
          ]
        : []),
      ...(decreasedToOff.length > 0
        ? [
            {
              code: 'protection_weakened' as const,
              protection,
              os: decreasedToOff,
              to: 'off' as const,
              text: protectionWeakenedText(protection, decreasedToOff, 'off'),
            },
          ]
        : []),
    ];
  });

const buildGlobalManifestVersionStaleAdvisory = (
  explicitChanges: readonly ExplicitPolicyChange[]
): PolicyAssessmentAdvisory | undefined => {
  const change = explicitChanges.find(({ path }) => path === 'global_manifest_version');
  if (change === undefined || typeof change.to !== 'string') {
    return undefined;
  }
  if (classifyGlobalManifestVersion(change.to) !== 'valid') {
    return undefined;
  }
  const ageDays = getGlobalManifestVersionAgeDays(change.to);
  if (ageDays < GLOBAL_MANIFEST_VERSION_OUTDATED_DAYS) {
    return undefined;
  }
  return {
    code: 'global_manifest_version_stale',
    value: change.to,
    ageDays,
    text: `Protection artifacts pinned to ${change.to} are ${ageDays} days old. Elastic recommends keeping protection artifacts up to date. After 18 months, protection artifacts expire and cannot be rolled back.`,
  };
};

const toPolicyChangeFact = (
  change: ExplicitPolicyChange,
  eligibilityContext: EligibilityContext
): PolicyChangeFact => {
  const entry = getFieldRegistryEntry(change.path);
  if (entry === undefined) {
    throw new Error(`Expanded policy change has no field registry entry: ${change.path}`);
  }

  return {
    path: change.path,
    from: change.from,
    to: change.to,
    origin: change.origin,
    registry: {
      path: entry.path,
      os: entry.os,
      kind: entry.kind,
      tier: entry.tier,
      documentation: entry.documentation,
      license: entry.license,
      minVersion: entry.minVersion,
      maxVersion: entry.maxVersion,
      source: entry.source,
      userEditable: entry.userEditable,
      productFeatureGate: entry.productFeatureGate,
    },
    eligibility: computePathEligibility(change.path, eligibilityContext),
  };
};

export const buildPolicyChangeAssessment = (
  policy: NormalizedEndpointPolicy,
  operations: readonly PolicyChangeOperation[],
  capabilities: PolicyChangeCapabilities
): PolicyChangeAssessment => {
  const prepared = prepareChangeSet(
    {
      idOrName: policy.snapshot.identity.id,
      changes: [...operations],
    },
    policy.storedConfig
  );
  const { endpointCustomNotification, ...eligibilityCapabilities } = capabilities;
  const eligibilityContext = buildEligibilityContext({
    ...eligibilityCapabilities,
    proposedConfig: prepared.proposedConfig,
  });
  const manifestStaleAdvisory = buildGlobalManifestVersionStaleAdvisory(prepared.explicitChanges);

  return {
    policy,
    proposed: normalize(prepared.proposedConfig),
    proposedConfig: prepared.proposedConfig,
    fields: getFieldRegistry(),
    requestedOperations: operations,
    changes: prepared.explicitChanges.map((change) =>
      toPolicyChangeFact(change, eligibilityContext)
    ),
    normalizedDiff: prepared.normalizedDiff,
    sideEffects: prepared.sideEffects,
    globalBlockers: [
      ...computeGlobalManifestBlockers(prepared.proposedConfig, eligibilityContext),
      ...(policy.snapshot.source.is_managed === true
        ? [{ reason: 'managed_policy_not_writable' }]
        : []),
      ...(isEndpointPolicyValidForLicense(prepared.proposedConfig, capabilities.licenseInformation)
        ? []
        : [{ reason: 'license_invalid_policy' }]),
      ...(checkIfPopupMessagesContainCustomNotifications(prepared.proposedConfig) &&
      !capabilities.endpointCustomNotification
        ? [{ reason: 'endpoint_custom_notification_disabled' }]
        : []),
      ...(getDeviceControlNotificationConflicts(prepared.proposedConfig).length > 0
        ? [{ reason: 'device_control_notification_requires_deny_all' }]
        : []),
    ],
    advisories: [
      ...buildProtectionWeakenedAdvisories(policy.storedConfig, prepared.proposedConfig),
      ...(manifestStaleAdvisory !== undefined ? [manifestStaleAdvisory] : []),
    ],
  };
};
