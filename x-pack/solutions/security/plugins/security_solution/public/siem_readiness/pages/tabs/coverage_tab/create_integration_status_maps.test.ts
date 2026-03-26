/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessPackageInfo } from '@kbn/siem-readiness';
import {
  createIntegrationStatusMapFromPackages,
  createIntegrationStatusMapFromSets,
} from './create_integration_status_maps';
import {
  INTEGRATIONS_ENABLED,
  INTEGRATIONS_DISABLED,
  INTEGRATIONS_UNINSTALLED,
} from '../../../../detection_engine/common/components/related_integrations/translations';

describe('createIntegrationStatusMapFromPackages', () => {
  it('should create status map with enabled status for installed packages with active policies', () => {
    const packages: SiemReadinessPackageInfo[] = [
      {
        id: 'endpoint-1',
        name: 'endpoint',
        title: 'Endpoint Security',
        version: '1.0.0',
        status: 'installed',
        packagePoliciesInfo: { count: 2 },
      },
    ];

    const result = createIntegrationStatusMapFromPackages(packages);

    expect(result.size).toBe(1);
    expect(result.get('endpoint')).toEqual({
      status: INTEGRATIONS_ENABLED,
      badgeColor: 'success',
      tooltip: expect.any(String),
    });
  });

  it('should create status map with disabled status for installed packages without active policies', () => {
    const packages: SiemReadinessPackageInfo[] = [
      {
        id: 'windows-1',
        name: 'windows',
        title: 'Windows',
        version: '1.0.0',
        status: 'installed',
        packagePoliciesInfo: { count: 0 },
      },
    ];

    const result = createIntegrationStatusMapFromPackages(packages);

    expect(result.size).toBe(1);
    expect(result.get('windows')).toEqual({
      status: INTEGRATIONS_DISABLED,
      badgeColor: 'primary',
      tooltip: expect.any(String),
    });
  });

  it('should create status map with uninstalled status for packages not installed', () => {
    const packages: SiemReadinessPackageInfo[] = [
      {
        id: 'aws-1',
        name: 'aws',
        title: 'AWS',
        version: '1.0.0',
        status: 'not_installed',
      },
    ];

    const result = createIntegrationStatusMapFromPackages(packages);

    expect(result.size).toBe(1);
    expect(result.get('aws')).toEqual({
      status: INTEGRATIONS_UNINSTALLED,
      badgeColor: 'default',
      tooltip: expect.any(String),
    });
  });

  it('should handle packages without packagePoliciesInfo', () => {
    const packages: SiemReadinessPackageInfo[] = [
      {
        id: 'azure-1',
        name: 'azure',
        title: 'Azure',
        version: '1.0.0',
        status: 'installed',
      },
    ];

    const result = createIntegrationStatusMapFromPackages(packages);

    expect(result.size).toBe(1);
    expect(result.get('azure')).toEqual({
      status: INTEGRATIONS_DISABLED,
      badgeColor: 'primary',
      tooltip: expect.any(String),
    });
  });

  it('should handle multiple packages with mixed statuses', () => {
    const packages: SiemReadinessPackageInfo[] = [
      {
        id: 'endpoint-1',
        name: 'endpoint',
        title: 'Endpoint Security',
        version: '1.0.0',
        status: 'installed',
        packagePoliciesInfo: { count: 2 },
      },
      {
        id: 'windows-1',
        name: 'windows',
        title: 'Windows',
        version: '1.0.0',
        status: 'installed',
        packagePoliciesInfo: { count: 0 },
      },
      {
        id: 'aws-1',
        name: 'aws',
        title: 'AWS',
        version: '1.0.0',
        status: 'not_installed',
      },
    ];

    const result = createIntegrationStatusMapFromPackages(packages);

    expect(result.size).toBe(3);
    expect(result.get('endpoint')?.status).toBe(INTEGRATIONS_ENABLED);
    expect(result.get('windows')?.status).toBe(INTEGRATIONS_DISABLED);
    expect(result.get('aws')?.status).toBe(INTEGRATIONS_UNINSTALLED);
  });

  it('should return empty map for empty packages array', () => {
    const result = createIntegrationStatusMapFromPackages([]);

    expect(result.size).toBe(0);
  });
});

describe('createIntegrationStatusMapFromSets', () => {
  it('should create status map with enabled status for integrations in enabled set', () => {
    const integrationNames = ['endpoint', 'windows'];
    const enabledSet = new Set(['endpoint', 'windows']);
    const disabledSet = new Set<string>();

    const result = createIntegrationStatusMapFromSets(integrationNames, enabledSet, disabledSet);

    expect(result.size).toBe(2);
    expect(result.get('endpoint')).toEqual({
      status: INTEGRATIONS_ENABLED,
      badgeColor: 'success',
      tooltip: expect.any(String),
    });
    expect(result.get('windows')).toEqual({
      status: INTEGRATIONS_ENABLED,
      badgeColor: 'success',
      tooltip: expect.any(String),
    });
  });

  it('should create status map with disabled status for integrations in disabled set', () => {
    const integrationNames = ['aws', 'azure'];
    const enabledSet = new Set<string>();
    const disabledSet = new Set(['aws', 'azure']);

    const result = createIntegrationStatusMapFromSets(integrationNames, enabledSet, disabledSet);

    expect(result.size).toBe(2);
    expect(result.get('aws')).toEqual({
      status: INTEGRATIONS_DISABLED,
      badgeColor: 'primary',
      tooltip: expect.any(String),
    });
    expect(result.get('azure')).toEqual({
      status: INTEGRATIONS_DISABLED,
      badgeColor: 'primary',
      tooltip: expect.any(String),
    });
  });

  it('should create status map with uninstalled status for integrations not in either set', () => {
    const integrationNames = ['gcp', 'okta'];
    const enabledSet = new Set<string>();
    const disabledSet = new Set<string>();

    const result = createIntegrationStatusMapFromSets(integrationNames, enabledSet, disabledSet);

    expect(result.size).toBe(2);
    expect(result.get('gcp')).toEqual({
      status: INTEGRATIONS_UNINSTALLED,
      badgeColor: 'default',
      tooltip: expect.any(String),
    });
    expect(result.get('okta')).toEqual({
      status: INTEGRATIONS_UNINSTALLED,
      badgeColor: 'default',
      tooltip: expect.any(String),
    });
  });

  it('should handle mixed integration statuses', () => {
    const integrationNames = ['endpoint', 'windows', 'aws', 'gcp'];
    const enabledSet = new Set(['endpoint']);
    const disabledSet = new Set(['windows', 'aws']);

    const result = createIntegrationStatusMapFromSets(integrationNames, enabledSet, disabledSet);

    expect(result.size).toBe(4);
    expect(result.get('endpoint')?.status).toBe(INTEGRATIONS_ENABLED);
    expect(result.get('windows')?.status).toBe(INTEGRATIONS_DISABLED);
    expect(result.get('aws')?.status).toBe(INTEGRATIONS_DISABLED);
    expect(result.get('gcp')?.status).toBe(INTEGRATIONS_UNINSTALLED);
  });

  it('should return empty map for empty integration names array', () => {
    const result = createIntegrationStatusMapFromSets([], new Set(), new Set());

    expect(result.size).toBe(0);
  });

  it('should prioritize enabled set over disabled set', () => {
    const integrationNames = ['endpoint'];
    const enabledSet = new Set(['endpoint']);
    const disabledSet = new Set(['endpoint']); // Same integration in both sets

    const result = createIntegrationStatusMapFromSets(integrationNames, enabledSet, disabledSet);

    expect(result.size).toBe(1);
    expect(result.get('endpoint')?.status).toBe(INTEGRATIONS_ENABLED);
  });
});
