/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { RuleChangesDiff } from './changes_diff';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { TestProviders } from '../../../../common/mock';

describe('RuleChangesDiff', () => {
  describe('component states', () => {
    it('renders loading skeleton when isLoading is true', () => {
      const { getByTestId } = renderComponent({ isLoading: true });

      expect(getByTestId('ruleChangesHistoryDiffLoading')).toBeInTheDocument();
    });

    it('ignores a selected item when isLoading is true', () => {
      const item = createRuleChangeHistoryItem({ action: 'rule_create' });

      const { getByTestId, queryByTestId } = renderComponent({ item, isLoading: true });

      expect(getByTestId('ruleChangesHistoryDiffLoading')).toBeInTheDocument();
      expect(queryByTestId('ruleChangesHistoryDiff')).not.toBeInTheDocument();
    });

    it('renders nothing-to-compare prompt when no item is selected', () => {
      const { getByTestId, getByText } = renderComponent({ item: undefined });

      expect(getByTestId('ruleChangesHistoryNothingSelected')).toBeInTheDocument();
      expect(getByText('Nothing to compare')).toBeInTheDocument();
    });
  });

  describe('rule_create', () => {
    it('renders green diff for `rule_create`', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_create',
        rule: { name: 'New Rule' } as RuleResponse,
        old_values: null,
      });

      const { getByTestId, queryByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
      expect(queryByTestId('ruleChangesHistoryNoDiffCallout')).not.toBeInTheDocument();
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('New Rule');
    });
  });

  describe('rule_update', () => {
    it('renders no-diff callout for `rule_update` pre-tracked (no history)', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_update',
        rule: {
          name: 'Updated Rule',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:00.000Z',
        } as RuleResponse,
        old_values: null,
      });

      const { getByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryNoDiffCallout')).toBeInTheDocument();
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('Updated Rule');
    });

    it('renders normal diff for `rule_update` normal edit (with history)', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_update',
        rule: { name: 'New Name', severity: 'high' } as RuleResponse,
        old_values: { name: 'Old Name' },
      });

      const { getByTestId, queryByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
      expect(queryByTestId('ruleChangesHistoryNoDiffCallout')).not.toBeInTheDocument();
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('Old Name');
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('New Name');
    });

    it('renders normal diff for `rule_update` adding a previously-absent field', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_update',
        rule: { name: 'Rule', note: 'added note' } as RuleResponse,
        old_values: { note: null },
      });

      const { getByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('added note');
    });

    it('renders no visible changes for `rule_update` with only ignored fields', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_update',
        rule: { name: 'My Rule' } as RuleResponse,
        old_values: { revision: 1, updated_at: '2024-01-01T00:00:00.000Z' },
      });

      const { getByTestId, getByText } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryNoChanges')).toBeInTheDocument();
      expect(getByText('No visible field changes')).toBeInTheDocument();
    });
  });

  describe('rule_import', () => {
    it('renders green diff for `rule_import` first-time creation', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_import',
        rule: {
          name: 'Imported Rule',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        } as RuleResponse,
        old_values: null,
      });

      const { getByTestId, queryByTestId } = renderComponent({ item });

      expect(queryByTestId('ruleChangesHistoryNoDiffCallout')).not.toBeInTheDocument();
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('Imported Rule');
    });

    it('renders no-diff callout for `rule_import` overwriting pre-tracking rule', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_import',
        rule: {
          name: 'Imported Rule',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:00.000Z',
        } as RuleResponse,
        old_values: null,
      });

      const { getByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryNoDiffCallout')).toBeInTheDocument();
    });
  });

  describe('rule_upgrade', () => {
    it('renders no-diff callout for `rule_upgrade` pre-tracked (no history)', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_upgrade',
        rule: {
          name: 'Upgraded Rule',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:00.000Z',
        } as RuleResponse,
        old_values: null,
      });

      const { getByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryNoDiffCallout')).toBeInTheDocument();
    });

    it('renders normal diff for `rule_upgrade` (with history)', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_upgrade',
        rule: {
          name: 'New Name',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:00.000Z',
        } as RuleResponse,
        old_values: { name: 'Old Name' },
      });

      const { getByTestId, queryByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
      expect(queryByTestId('ruleChangesHistoryNoDiffCallout')).not.toBeInTheDocument();
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('Old Name');
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('New Name');
    });

    it('renders normal diff for `rule_upgrade` rule-type change (recreation)', () => {
      // Type change recreates the rule; the preceding rule_delete supplies non-null old_values.
      const item = createRuleChangeHistoryItem({
        action: 'rule_upgrade',
        rule: {
          name: 'Recreated Rule',
          type: 'query',
          created_at: '2024-06-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:01.000Z',
        } as RuleResponse,
        old_values: { type: 'eql' },
      });

      const { getByTestId, queryByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryDiff')).toBeInTheDocument();
      expect(queryByTestId('ruleChangesHistoryNoDiffCallout')).not.toBeInTheDocument();
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('eql');
      expect(getByTestId('ruleChangesHistoryDiff')).toHaveTextContent('query');
    });
  });

  describe('rule_revert', () => {
    it('renders no-diff callout for `rule_revert` pre-tracked (no history)', () => {
      const item = createRuleChangeHistoryItem({
        action: 'rule_revert',
        rule: {
          name: 'Reverted Rule',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-06-01T00:00:00.000Z',
        } as RuleResponse,
        old_values: null,
      });

      const { getByTestId } = renderComponent({ item });

      expect(getByTestId('ruleChangesHistoryNoDiffCallout')).toBeInTheDocument();
    });
  });
});

function createRuleChangeHistoryItem(overrides: Partial<RuleHistoryItem> = {}): RuleHistoryItem {
  return {
    id: 'item-1',
    timestamp: '2025-01-01T00:00:00.000Z',
    action: 'rule_create',
    rule: {} as RuleResponse,
    old_values: null,
    ...overrides,
  };
}

function renderComponent({
  item,
  isLoading,
}: {
  item?: RuleHistoryItem;
  isLoading?: boolean;
}): RenderResult {
  return render(
    <TestProviders>
      <RuleChangesDiff item={item} isLoading={isLoading} />
    </TestProviders>
  );
}
