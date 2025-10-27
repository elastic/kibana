/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UpdateMissingIndex } from './update_missing_index';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { getRuleMigrationRuleMock } from '../../../../../../common/siem_migrations/model/__mocks__';
import { getRuleMigrationTranslationStatsMock } from '../../../__mocks__';
import { SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../common/siem_migrations/constants';

describe('UpdateMissingIndex', () => {
  it('renders the update missing index button', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 1,
        success: {
          total: 1,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 0,
          },
          installable: 0,
          missing_index: 1,
          prebuilt: 0,
        },
        failed: 0,
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <UpdateMissingIndex
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('updateMissingIndexPatternButton')).toBeInTheDocument();
  });

  it('does not render the button if there are no rules with missing index patterns', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 1,
        success: {
          total: 1,
          result: {
            full: 1,
            partial: 0,
            untranslatable: 0,
          },
          installable: 1,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 0,
      },
    });

    const { queryByTestId } = render(
      <TestProviders>
        <UpdateMissingIndex
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(queryByTestId('updateMissingIndexPatternButton')).not.toBeInTheDocument();
  });

  it('calls the setMissingIndexPatternFlyoutOpen handler when the button is clicked', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 1,
        success: {
          total: 1,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 0,
          },
          installable: 0,
          missing_index: 1,
          prebuilt: 0,
        },
        failed: 0,
      },
    });
    const setMissingIndexPatternFlyoutOpen = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <UpdateMissingIndex
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={setMissingIndexPatternFlyoutOpen}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('updateMissingIndexPatternButton'));
    expect(setMissingIndexPatternFlyoutOpen).toHaveBeenCalled();
  });

  it('shows the correct text when rules are selected', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 2,
        success: {
          total: 2,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 0,
          },
          installable: 0,
          missing_index: 2,
          prebuilt: 0,
        },
        failed: 0,
      },
    });
    const selectedRules = [
      getRuleMigrationRuleMock({
        id: '1',
        elastic_rule: {
          title: 'test',
          query: SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER,
        },
      }),
    ];
    const { getByText } = render(
      <TestProviders>
        <UpdateMissingIndex
          selectedRules={selectedRules}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByText('Update selected missing index pattern (1)')).toBeInTheDocument();
  });

  it('disables the button when a rule without a missing index pattern is selected', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 2,
        success: {
          total: 2,
          result: {
            full: 1,
            partial: 0,
            untranslatable: 0,
          },
          installable: 1,
          missing_index: 1,
          prebuilt: 0,
        },
        failed: 0,
      },
    });
    const selectedRules = [
      getRuleMigrationRuleMock({
        id: '1',
        elastic_rule: { title: 'test', query: 'some other query' },
      }),
    ];
    const { getByTestId } = render(
      <TestProviders>
        <UpdateMissingIndex
          selectedRules={selectedRules}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('updateMissingIndexPatternButton')).toBeDisabled();
  });
});
