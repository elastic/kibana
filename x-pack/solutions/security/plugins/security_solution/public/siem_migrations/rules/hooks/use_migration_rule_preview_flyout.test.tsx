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
        getMigrationRuleData: mockGetMigrationRuleData,
        ruleActionsFactory: mockRuleActionsFactory,
      })
    );

    expect(result.current.migrationRuleDetailsFlyout).toBeUndefined();
  });

  it('should open the flyout when openMigrationRuleDetails is called', () => {
    const { result } = renderHook(() =>
      useMigrationRuleDetailsFlyout({
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
});
