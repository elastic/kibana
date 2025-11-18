/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useShouldShowAlertsOnlyMigrationMessage } from './use_show_alerts_only_migration_message';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';

jest.mock('../../../../../../common/hooks/use_space_id');

describe('useShouldShowAlertsOnlyMigrationMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true', () => {
    (useSpaceId as jest.Mock).mockReturnValue('default');

    const { result } = renderHook(() =>
      useShouldShowAlertsOnlyMigrationMessage({
        currentTimelineIndices: ['.alerts-security.alerts'],
        dataViewId: 'security-solution-default',
      })
    );

    expect(result.current).toBe(true);
  });

  it('should return false if not the correct dataview', () => {
    (useSpaceId as jest.Mock).mockReturnValue('default');

    const { result } = renderHook(() =>
      useShouldShowAlertsOnlyMigrationMessage({
        currentTimelineIndices: ['.alerts-security.alerts'],
        dataViewId: 'wrong_dataview',
      })
    );

    expect(result.current).toBe(false);
  });

  it('should return false if too many indices', () => {
    (useSpaceId as jest.Mock).mockReturnValue('default');

    const { result } = renderHook(() =>
      useShouldShowAlertsOnlyMigrationMessage({
        currentTimelineIndices: ['.alerts-security.alerts', '.another-index'],
        dataViewId: 'security-solution-default',
      })
    );

    expect(result.current).toBe(false);
  });

  it('should return false if index does not match', () => {
    (useSpaceId as jest.Mock).mockReturnValue('default');

    const { result } = renderHook(() =>
      useShouldShowAlertsOnlyMigrationMessage({
        currentTimelineIndices: ['.wrong-index'],
        dataViewId: 'security-solution-default',
      })
    );

    expect(result.current).toBe(false);
  });
});
