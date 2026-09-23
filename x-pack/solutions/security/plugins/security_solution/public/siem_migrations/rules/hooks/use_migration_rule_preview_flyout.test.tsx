/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SiemMigrationStatus } from '../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';
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
    // The shared mock has 2 rules: '1' (completed) and '2' (failed). Navigation reads
    // id and status only, so extra fixtures are shallow spreads with overridden id/status.
    const completedRule = (id: string): RuleMigrationRule => ({
      ...migrationRules[1],
      id,
      status: SiemMigrationStatus.COMPLETED,
    });
    const failedRule = migrationRules[1]; // id '2', status failed

    const threeRules = [
      migrationRules[0], // id '1'
      completedRule('2'),
      completedRule('3'),
    ];

    const getRuleDataFor = (rules: RuleMigrationRule[]) => (ruleId: string) => ({
      migrationRule: rules.find((rule) => rule.id === ruleId),
      matchedPrebuiltRule: undefined,
    });

    const renderNavigationHook = (rules = threeRules, dataSource = threeRules) =>
      renderHook(() =>
        useMigrationRuleDetailsFlyout({
          migrationRules: rules,
          getMigrationRuleData: getRuleDataFor(dataSource),
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

    describe('failed rules', () => {
      it('should disable the previous arrow when only failed rules are before the opened rule', () => {
        const rules = [failedRule, migrationRules[0], completedRule('3')];
        const { result } = renderNavigationHook(rules, rules);

        act(() => {
          result.current.openMigrationRuleDetails(migrationRules[0]);
        });

        expect(result.current.navigation).toEqual(
          expect.objectContaining({ hasPrevious: false, hasNext: true })
        );

        act(() => {
          result.current.navigation.goToPrevious();
        });

        expect(result.current.openedMigrationRuleId).toBe('1');
      });

      it('should disable the next arrow when only failed rules are after the opened rule', () => {
        const rules = [migrationRules[0], completedRule('3'), failedRule];
        const { result } = renderNavigationHook(rules, rules);

        act(() => {
          result.current.openMigrationRuleDetails(completedRule('3'));
        });

        expect(result.current.navigation).toEqual(
          expect.objectContaining({ hasPrevious: true, hasNext: false })
        );

        act(() => {
          result.current.navigation.goToNext();
        });

        expect(result.current.openedMigrationRuleId).toBe('3');
      });

      it('should skip a failed rule in the middle of the page', () => {
        const rules = [migrationRules[0], failedRule, completedRule('3')];
        const { result } = renderNavigationHook(rules, rules);

        act(() => {
          result.current.openMigrationRuleDetails(migrationRules[0]);
        });
        act(() => {
          result.current.navigation.goToNext();
        });

        expect(result.current.openedMigrationRuleId).toBe('3');

        act(() => {
          result.current.navigation.goToPrevious();
        });

        expect(result.current.openedMigrationRuleId).toBe('1');
      });
    });
  });
});
