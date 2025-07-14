/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { UpgradeConflictsDescription } from './upgrade_conflicts_description';
import { TestProviders } from '../../../../../../common/mock';

// Removes extra whitespace from the text content to make it easier to compare
function normalizeText(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

describe('UpgradeConflictsDescription displays proper text when there are', () => {
  it('only rules with solvable conflicts', () => {
    const { container } = render(
      <UpgradeConflictsDescription
        numOfRulesWithoutConflicts={0}
        numOfRulesWithSolvableConflicts={5}
        numOfRulesWithNonSolvableConflicts={0}
      />,
      { wrapper: TestProviders }
    );

    const expectedText = [
      'Rules with auto-resolved conflicts: 5',
      '5 rules with auto-resolved conflicts can still be updated. Choose one of the following options:',
      'Use the rule update flyout to address auto-resolved conflicts. This is the safest option and gives you more control over the final update. Learn more(external, opens in a new tab or window)',
      'Click Update rules to bulk-update rules with auto-resolved conflicts and rules without conflicts.',
      'Only choose this option if you’re comfortable accepting the fixes Elastic suggested.',
    ].join('');

    expect(normalizeText(container.textContent)).toBe(normalizeText(expectedText));
  });

  it('only rules with non-solvable conflicts', () => {
    const { container } = render(
      <UpgradeConflictsDescription
        numOfRulesWithoutConflicts={0}
        numOfRulesWithSolvableConflicts={0}
        numOfRulesWithNonSolvableConflicts={5}
      />,
      { wrapper: TestProviders }
    );

    const expectedText = [
      'Rules with unresolved conflicts: 5',
      '5 rules with unresolved conflicts can’t be updated until you fix the conflicts.',
    ].join('');

    expect(normalizeText(container.textContent)).toBe(normalizeText(expectedText));
  });

  it('rules with solvable conflicts and rules with non-solvable conflicts', () => {
    const { container } = render(
      <UpgradeConflictsDescription
        numOfRulesWithoutConflicts={0}
        numOfRulesWithSolvableConflicts={3}
        numOfRulesWithNonSolvableConflicts={5}
      />,
      { wrapper: TestProviders }
    );

    const expectedText = [
      'Rules with unresolved conflicts: 5',
      'Rules with auto-resolved conflicts: 3',
      '5 rules with unresolved conflicts can’t be updated until you fix the conflicts.',
      '3 rules with auto-resolved conflicts can still be updated. Choose one of the following options:',
      'Use the rule update flyout to address auto-resolved conflicts. This is the safest option and gives you more control over the final update. Learn more(external, opens in a new tab or window)',
      'Click Update rules to bulk-update rules with auto-resolved conflicts and rules without conflicts.',
      'Only choose this option if you’re comfortable accepting the fixes Elastic suggested.',
    ].join('');

    expect(normalizeText(container.textContent)).toBe(normalizeText(expectedText));
  });

  it('rules with solvable conflicts and conflict-free rules', () => {
    const { container } = render(
      <UpgradeConflictsDescription
        numOfRulesWithoutConflicts={10}
        numOfRulesWithSolvableConflicts={3}
        numOfRulesWithNonSolvableConflicts={0}
      />,
      { wrapper: TestProviders }
    );

    const expectedText = [
      'Rules with auto-resolved conflicts: 3',
      'Rules without conflicts: 10',
      '3 rules with auto-resolved conflicts can still be updated. Choose one of the following options:',
      'Use the rule update flyout to address auto-resolved conflicts. This is the safest option and gives you more control over the final update. Learn more(external, opens in a new tab or window)',
      'Click Update rules to bulk-update rules with auto-resolved conflicts and rules without conflicts.',
      'Only choose this option if you’re comfortable accepting the fixes Elastic suggested.',
      '10 rules without conflicts can still be updated by clicking Update rules without conflicts. Choose this option if you only want to update rules without conflicts.',
    ].join('');

    expect(normalizeText(container.textContent)).toBe(normalizeText(expectedText));
  });

  it('rules with non-solvable conflicts and conflict-free rules', () => {
    const { container } = render(
      <UpgradeConflictsDescription
        numOfRulesWithoutConflicts={10}
        numOfRulesWithSolvableConflicts={0}
        numOfRulesWithNonSolvableConflicts={5}
      />,
      { wrapper: TestProviders }
    );

    const expectedText = [
      'Rules with unresolved conflicts: 5',
      'Rules without conflicts: 10',
      '5 rules with unresolved conflicts can’t be updated until you fix the conflicts.',
      '10 rules without conflicts can still be updated by clicking Update rules without conflicts. Choose this option if you only want to update rules without conflicts.',
    ].join('');

    expect(normalizeText(container.textContent)).toBe(normalizeText(expectedText));
  });

  it('rules with non-solvable conflicts, rules with solvable conflicts and conflict-free rules', () => {
    const { container } = render(
      <UpgradeConflictsDescription
        numOfRulesWithoutConflicts={10}
        numOfRulesWithSolvableConflicts={3}
        numOfRulesWithNonSolvableConflicts={5}
      />,
      { wrapper: TestProviders }
    );

    const expectedText = [
      'Rules with unresolved conflicts: 5',
      'Rules with auto-resolved conflicts: 3',
      'Rules without conflicts: 10',
      '5 rules with unresolved conflicts can’t be updated until you fix the conflicts.',
      '3 rules with auto-resolved conflicts can still be updated. Choose one of the following options:',
      'Use the rule update flyout to address auto-resolved conflicts. This is the safest option and gives you more control over the final update. Learn more(external, opens in a new tab or window)',
      'Click Update rules to bulk-update rules with auto-resolved conflicts and rules without conflicts.',
      'Only choose this option if you’re comfortable accepting the fixes Elastic suggested.',
      '10 rules without conflicts can still be updated by clicking Update rules without conflicts. Choose this option if you only want to update rules without conflicts.',
    ].join('');

    expect(normalizeText(container.textContent)).toBe(normalizeText(expectedText));
  });
});
