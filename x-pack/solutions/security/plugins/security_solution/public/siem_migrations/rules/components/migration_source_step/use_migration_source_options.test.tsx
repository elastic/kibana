/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMigrationSourceOptions } from './use_migration_source_options';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { MigrationSource } from '../../../common/types';

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockExperimentalFeature = (
  flags: Partial<Record<'qradarRulesMigration' | 'sentinelRulesMigration', boolean>>
) => {
  (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
    (feature: 'qradarRulesMigration' | 'sentinelRulesMigration') => flags[feature] ?? false
  );
};

describe('useMigrationSourceOptions', () => {
  it('returns only Splunk option when QRadar and Sentinel features are disabled', () => {
    mockExperimentalFeature({});
    const { result } = renderHook(() => useMigrationSourceOptions());

    expect(result.current.map((option) => option.value)).toEqual([MigrationSource.SPLUNK]);
  });

  it('returns Splunk and QRadar options when only QRadar feature is enabled', () => {
    mockExperimentalFeature({ qradarRulesMigration: true });
    const { result } = renderHook(() => useMigrationSourceOptions());

    expect(result.current.map((option) => option.value)).toEqual([
      MigrationSource.SPLUNK,
      MigrationSource.QRADAR,
    ]);
  });

  it('returns Splunk and Sentinel options when only Sentinel feature is enabled', () => {
    mockExperimentalFeature({ sentinelRulesMigration: true });
    const { result } = renderHook(() => useMigrationSourceOptions());

    expect(result.current.map((option) => option.value)).toEqual([
      MigrationSource.SPLUNK,
      MigrationSource.SENTINEL,
    ]);
  });

  it('returns Splunk, QRadar, and Sentinel options when both features are enabled', () => {
    mockExperimentalFeature({ qradarRulesMigration: true, sentinelRulesMigration: true });
    const { result } = renderHook(() => useMigrationSourceOptions());

    expect(result.current.map((option) => option.value)).toEqual([
      MigrationSource.SPLUNK,
      MigrationSource.QRADAR,
      MigrationSource.SENTINEL,
    ]);
  });
});
