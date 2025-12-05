/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QradarDataInputStep,
  SplunkDataInputStep,
} from '../components/data_input_flyout/steps/constants';
import type { UseMigrationStepsProps } from './use_migration_steps';
import { useMigrationSteps } from './use_migration_steps';
import { renderHook } from '@testing-library/react';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { MigrationSource } from '../types';

describe('useMigrationSteps', () => {
  const props: UseMigrationStepsProps = {
    dataInputStep: {
      [MigrationSource.SPLUNK]: SplunkDataInputStep.Rules,
      [MigrationSource.QRADAR]: QradarDataInputStep.Rules,
    },
    migrationSource: MigrationSource.SPLUNK,
    setMigrationDataInputStep: jest.fn(),
    migrationStats: {
      id: 'test-id',
      name: 'test-name',
      status: SiemMigrationTaskStatus.FINISHED,
      items: {
        total: 1,
        pending: 0,
        failed: 0,
        completed: 1,
        processing: 0,
      },
      created_at: '2024-01-01T00:00:00Z',
      last_updated_at: '2024-01-01T00:00:00Z',
    },
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
  };

  it('should return Splunk migration steps when migration source is Splunk', () => {
    const { result } = renderHook(() =>
      useMigrationSteps({ ...props, migrationSource: MigrationSource.SPLUNK })
    );
    expect(result.current?.length).toEqual(3);
    expect(result.current?.[0].id).toBe(SplunkDataInputStep.Rules);
    expect(result.current?.[1].id).toBe(SplunkDataInputStep.Macros);
    expect(result.current?.[2].id).toBe(SplunkDataInputStep.Lookups);
  });
  it('should return Qradar migration steps when migration source is Qradar', () => {
    const { result } = renderHook(() =>
      useMigrationSteps({ ...props, migrationSource: MigrationSource.QRADAR })
    );
    expect(result.current?.length).toEqual(1);
    expect(result.current?.[0].id).toBe(QradarDataInputStep.Rules);
  });
});
