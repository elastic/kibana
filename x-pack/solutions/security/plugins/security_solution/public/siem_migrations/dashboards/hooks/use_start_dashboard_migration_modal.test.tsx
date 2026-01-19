/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useStartDashboardsMigrationModal } from './use_start_dashboard_migration_modal';
import type { StartMigrationModalProps } from '../../common/components/start_migration_modal';

jest.mock('../../common/components/start_migration_modal', () => ({
  StartMigrationModal: (props: StartMigrationModalProps) => (
    <div data-test-subj="start-migration-modal" {...props} />
  ),
}));

describe('useStartDashboardsMigrationModal', () => {
  const onStartMigrationWithSettings = jest.fn();

  it('should not render modal initially', () => {
    const { result } = renderHook(() =>
      useStartDashboardsMigrationModal({
        type: 'start',
        onStartMigrationWithSettings,
      })
    );

    expect(result.current.modal).toBeNull();
  });

  it('should open and close modal', () => {
    const { result, rerender } = renderHook(() =>
      useStartDashboardsMigrationModal({
        type: 'start',
        onStartMigrationWithSettings,
      })
    );

    act(() => {
      result.current.showModal();
    });

    rerender();

    expect(result.current.modal).not.toBeNull();

    act(() => {
      result.current.closeModal();
    });

    rerender();

    expect(result.current.modal).toBeNull();
  });

  it('should have correct title for "start" type', () => {
    const { result, rerender } = renderHook(() =>
      useStartDashboardsMigrationModal({
        type: 'start',
        onStartMigrationWithSettings,
      })
    );

    act(() => {
      result.current.showModal();
    });

    rerender();

    expect(result.current.modal?.props.title).toEqual('Migrate dashboards');
  });

  it('should have correct title for "retry" type', () => {
    const { result, rerender } = renderHook(() =>
      useStartDashboardsMigrationModal({
        type: 'retry',
        onStartMigrationWithSettings,
      })
    );

    act(() => {
      result.current.showModal();
    });

    rerender();

    expect(result.current.modal?.props.title).toEqual('Retry dashboards migration');
  });

  it('should have correct title for "reprocess" type', () => {
    const { result, rerender } = renderHook(() =>
      useStartDashboardsMigrationModal({
        type: 'reprocess',
        translationStats: {
          id: '1',
          dashboards: {
            failed: 5,
            success: {
              total: 0,
              result: { full: 0, partial: 0, untranslatable: 0 },
              installable: 0,
            },
            total: 5,
          },
        },
        onStartMigrationWithSettings,
      })
    );

    act(() => {
      result.current.showModal();
    });

    rerender();

    expect(result.current.modal?.props.title).toEqual('Reprocess 5 dashboards');
  });
});
