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

describe('useMigrationSourceOptions', () => {
  it('returns only Splunk option when QRadar feature is disabled', () => {
    const { result } = renderHook(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      return useMigrationSourceOptions();
    });
    expect(result.current.length).toEqual(1);
    expect(result.current[0].value).toEqual(MigrationSource.SPLUNK);
  });
  it('returns Splunk and QRadar options when QRadar feature is enabled', () => {
    const { result } = renderHook(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      return useMigrationSourceOptions();
    });
    expect(result.current.length).toEqual(2);
    expect(result.current[0].value).toEqual(MigrationSource.SPLUNK);
    expect(result.current[1].value).toEqual(MigrationSource.QRADAR);
  });
});
