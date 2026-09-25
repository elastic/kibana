/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { SecuritySubFeatureId } from '../../product_features_keys';
import { getSecurityV5SubFeaturesMap } from './kibana_sub_features';

/**
 * Mirrors the defaults in `security_solution/common/experimental_features.ts`,
 * which this package cannot import from.
 */
const PRODUCTION_FLAGS = {
  trustedDevices: true,
  responseActionsScriptLibraryManagement: true,
  customYaraSignaturesEnabled: false,
};

const ALL_FLAGS_ENABLED = { ...PRODUCTION_FLAGS, customYaraSignaturesEnabled: true };

const getSubFeaturesMap = (experimentalFeatures: Record<string, boolean>) =>
  getSecurityV5SubFeaturesMap({ experimentalFeatures, savedObjects: [] });

const getDisplayedFields = (subFeature: SubFeatureConfig) => ({
  name: subFeature.name,
  description: subFeature.description,
  privileges: subFeature.privilegeGroups.flatMap((group) =>
    group.privileges.map((privilege) => privilege.name)
  ),
});

describe('getSecurityV5SubFeaturesMap', () => {
  it('registers the expected sub-features, in display order, with their help text and privilege levels', () => {
    const subFeatures = [...getSubFeaturesMap(PRODUCTION_FLAGS).values()];

    expect(subFeatures.map(getDisplayedFields)).toEqual([
      {
        name: 'Endpoint List',
        description:
          'Displays all hosts running Elastic Defend and their relevant integration details.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Automatic Troubleshooting',
        description: 'Access to the automatic troubleshooting.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'SOC Management',
        description:
          'Access to SOC management capabilities including AI value reporting and analytics.',
        privileges: ['All'],
      },
      {
        name: 'Global Artifact Management',
        description:
          'Manage global assignment of endpoint artifacts (e.g., Trusted Applications, Event Filters) ' +
          'across all policies. This privilege controls global assignment rights only; privileges for each ' +
          'artifact type are required for full artifact management.',
        privileges: ['All'],
      },
      {
        name: 'Trusted Applications',
        description:
          'Helps mitigate conflicts with other software, usually other antivirus or endpoint security applications.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Trusted Devices',
        description: 'Manage security exceptions for USB and external devices.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Host Isolation Exceptions',
        description:
          'Add specific IP addresses that isolated hosts are still allowed to communicate with, even when isolated from the rest of the network.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Blocklist',
        description:
          'Extend Elastic Defend’s protection against malicious processes and protect against potentially harmful applications.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Event Filters',
        description:
          'Filter out endpoint events that you do not need or want stored in Elasticsearch.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Endpoint Exceptions',
        description:
          'Reduce false positive alerts, and keep Elastic Defend from blocking standard processes.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Elastic Defend Policy Management',
        description:
          'Access the Elastic Defend integration policy to configure protections, event collection, and advanced policy features.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Elastic Defend Scripts Management',
        description: 'Management of scripts used with Elastic Defend response actions.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Response Actions History',
        description: 'Access the history of response actions performed on endpoints.',
        privileges: ['All', 'Read'],
      },
      {
        name: 'Host Isolation',
        description: 'Perform the "isolate" and "release" response actions.',
        privileges: ['All'],
      },
      {
        name: 'Process Operations',
        description: 'Perform process-related response actions in the response console.',
        privileges: ['All'],
      },
      {
        name: 'File Operations',
        description: 'Perform file-related response actions in the response console.',
        privileges: ['All'],
      },
      {
        name: 'Execute Operations',
        description: 'Perform script execution response actions in the response console.',
        privileges: ['All'],
      },
      {
        name: 'Scan Operations',
        description: 'Perform folder scan response actions in the response console.',
        privileges: ['All'],
      },
    ]);
  });

  it('does not set a privileges tooltip on any sub-feature', () => {
    // Every flag enabled, so the flag-gated sub-features are covered too.
    const subFeatures = [...getSubFeaturesMap(ALL_FLAGS_ENABLED).values()];

    expect(subFeatures.length).toBeGreaterThan(0);
    for (const subFeature of subFeatures) {
      expect(subFeature.privilegesTooltip).toBeUndefined();
    }
  });

  it.each([
    { flag: 'trustedDevices', subFeatureId: SecuritySubFeatureId.trustedDevices },
    {
      flag: 'responseActionsScriptLibraryManagement',
      subFeatureId: SecuritySubFeatureId.scriptsManagement,
    },
    {
      flag: 'customYaraSignaturesEnabled',
      subFeatureId: SecuritySubFeatureId.customYaraSignatures,
    },
  ])('registers $subFeatureId only when `$flag` is enabled', ({ flag, subFeatureId }) => {
    expect(getSubFeaturesMap({ ...PRODUCTION_FLAGS, [flag]: true }).has(subFeatureId)).toBe(true);
    expect(getSubFeaturesMap({ ...PRODUCTION_FLAGS, [flag]: false }).has(subFeatureId)).toBe(false);
  });
});
