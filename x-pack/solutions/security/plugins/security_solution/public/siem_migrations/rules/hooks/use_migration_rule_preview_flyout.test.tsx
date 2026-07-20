/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { migrationRules } from '../__mocks__/migration_rules';
import { useMigrationRuleDetailsFlyout } from './use_migration_rule_preview_flyout';

jest.mock('../components/rule_details_flyout', () => ({
  MigrationRuleDetailsFlyout: (props: { children: React.ReactNode }) => (
    <div data-test-subj="migration-rule-details-flyout">{props.children}</div>
  ),
}));

describe('useMigrationRuleDetailsFlyout', () => {
  const mockRule = migrationRules[0];

  const mockGetMigrationRuleData = jest.fn(() => ({
    migrationRule: mockRule,
    matchedPrebuiltRule: undefined,
  }));
  const mockRuleActionsFactory = jest.fn(() => <div>{'Rule Actions'}</div>);
  const mockExtraTabsFactory = jest.fn(() => []);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined flyout initially', () => {
    const { result } = renderHook(() =>
      useMigrationRuleDetailsFlyout({
        migrationRules,
        getMigrationRuleData: mockGetMigrationRuleData,
        ruleActionsFactory: mockRuleActionsFactory,
      })
    );

    expect(result.current.migrationRuleDetailsFlyout).toBeUndefined();
  });

  it('should open the flyout when openMigrationRuleDetails is called', () => {
    const { result } = renderHook(() =>
      useMigrationRuleDetailsFlyout({
        migrationRules,
        getMigrationRuleData: mockGetMigrationRuleData,
        ruleActionsFactory: mockRuleActionsFactory,
      })
    );

    act(() => {
      result.current.openMigrationRuleDetails(mockRule);
    });

    expect(result.current.migrationRuleDetailsFlyout).toBeDefined();
    expect(mockGetMigrationRuleData).toHaveBeenCalledWith('1');
    expect(mockRuleActionsFactory).toHaveBeenCalledWith(mockRule, expect.any(Function));
  });

  it('should close the flyout when closeMigrationRuleDetails is called', () => {
    const { result } = renderHook(() =>
      useMigrationRuleDetailsFlyout({
        migrationRules,
        getMigrationRuleData: mockGetMigrationRuleData,
        ruleActionsFactory: mockRuleActionsFactory,
      })
    );

    act(() => {
      result.current.openMigrationRuleDetails(mockRule);
    });

    expect(result.current.migrationRuleDetailsFlyout).toBeDefined();

    act(() => {
      result.current.closeMigrationRuleDetails();
    });

    expect(result.current.migrationRuleDetailsFlyout).toBeUndefined();
  });

  it('should call extraTabsFactory if provided', () => {
    const { result } = renderHook(() =>
      useMigrationRuleDetailsFlyout({
        migrationRules,
        getMigrationRuleData: mockGetMigrationRuleData,
        ruleActionsFactory: mockRuleActionsFactory,
        extraTabsFactory: mockExtraTabsFactory,
      })
    );

    act(() => {
      result.current.openMigrationRuleDetails(mockRule);
    });

    expect(mockExtraTabsFactory).toHaveBeenCalledWith(mockRule);
  });

  describe('rule navigation', () => {
    // The shared mock has only 2 rules; a local 3-rule fixture is needed to exercise a
    // genuine middle-of-page position (nested refs shared with rule '2' — nav reads id only).
    const threeRules = [
      migrationRules[0], // id '1'
      migrationRules[1], // id '2'
      { ...migrationRules[1], id: '3' },
    ];
    const getRuleData = (ruleId: string) => ({
      migrationRule: threeRules.find((rule) => rule.id === ruleId),
      matchedPrebuiltRule: undefined,
    });

    const renderNavigationHook = (rules = threeRules) =>
      renderHook(() =>
        useMigrationRuleDetailsFlyout({
          migrationRules: rules,
          getMigrationRuleData: getRuleData,
          ruleActionsFactory: mockRuleActionsFactory,
        })
      );

    it('should expose the opened rule id so consumers can highlight it', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[0]);
      });

      expect(result.current.openedMigrationRuleId).toBe('1');
    });

    it('should clear the opened rule id when the flyout is closed', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[0]);
      });
      act(() => {
        result.current.closeMigrationRuleDetails();
      });

      expect(result.current.openedMigrationRuleId).toBeUndefined();
      expect(result.current.navigation).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );
    });

    it('should show the next rule when navigating forward', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[0]);
      });
      act(() => {
        result.current.navigation.goToNext();
      });

      expect(result.current.openedMigrationRuleId).toBe('2');
    });

    it('should show the previous rule when navigating backward', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[1]);
      });
      act(() => {
        result.current.navigation.goToPrevious();
      });

      expect(result.current.openedMigrationRuleId).toBe('1');
    });

    it('should allow navigating both ways from the middle of the page', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[1]);
      });

      expect(result.current.navigation).toEqual(
        expect.objectContaining({ hasPrevious: true, hasNext: true })
      );
    });

    it('should not allow navigating before the first rule of the page', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[0]);
      });

      expect(result.current.navigation.hasPrevious).toBe(false);

      act(() => {
        result.current.navigation.goToPrevious();
      });

      expect(result.current.openedMigrationRuleId).toBe('1');
    });

    it('should not allow navigating past the last rule of the page', () => {
      const { result } = renderNavigationHook();

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[2]);
      });

      expect(result.current.navigation.hasNext).toBe(false);

      act(() => {
        result.current.navigation.goToNext();
      });

      expect(result.current.openedMigrationRuleId).toBe('3');
    });

    it('should disable navigation in both directions when the opened rule is not in the loaded page', () => {
      const { result } = renderNavigationHook([threeRules[1], threeRules[2]]);

      act(() => {
        result.current.openMigrationRuleDetails(threeRules[0]);
      });

      expect(result.current.navigation).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => {
        result.current.navigation.goToNext();
      });
      act(() => {
        result.current.navigation.goToPrevious();
      });

      expect(result.current.openedMigrationRuleId).toBe('1');
    });
  });
});
