/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { TranslationTab } from '.';
import { getRuleMigrationRuleMock } from '../../../../../../../common/siem_migrations/model/__mocks__';
import { MigrationTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import * as i18n from './translations';

jest.mock('./callout', () => ({
  TranslationCallOut: () => <div data-test-subj="translationCallout" />,
}));

jest.mock('./query_details', () => ({
  OriginalRuleQuery: () => <div data-test-subj="originalRuleQuery" />,
  TranslatedRuleQuery: () => <div data-test-subj="translatedRuleQuery" />,
}));

describe('TranslationTab', () => {
  it('renders callout and query details when not installed', () => {
    const { getByTestId } = render(<TranslationTab migrationRule={getRuleMigrationRuleMock()} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('translationCallout')).toBeInTheDocument();
    expect(getByTestId('originalRuleQuery')).toBeInTheDocument();
    expect(getByTestId('translatedRuleQuery')).toBeInTheDocument();
  });

  it('does not render callout when installed', () => {
    const installedRule = getRuleMigrationRuleMock({ elastic_rule: { id: '1', title: 'test' } });
    const { queryByTestId } = render(<TranslationTab migrationRule={installedRule} />, {
      wrapper: TestProviders,
    });
    expect(queryByTestId('translationCallout')).not.toBeInTheDocument();
  });

  it('renders "Installed" badge when installed', () => {
    const installedRule = getRuleMigrationRuleMock({ elastic_rule: { id: '1', title: 'test' } });
    const { getByTestId } = render(<TranslationTab migrationRule={installedRule} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('translationResultBadge')).toHaveTextContent(i18n.INSTALLED_LABEL);
  });

  it('renders "Fully translated" badge for full translation', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: MigrationTranslationResult.FULL,
    });
    const { getByTestId } = render(<TranslationTab migrationRule={rule} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('translationResultBadge')).toHaveTextContent('Translated');
  });

  it('renders "Partially translated" badge for partial translation', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: MigrationTranslationResult.PARTIAL,
    });
    const { getByTestId } = render(<TranslationTab migrationRule={rule} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('translationResultBadge')).toHaveTextContent('Partially translated');
  });

  it('renders "Could not be translated" badge for untranslatable', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: MigrationTranslationResult.UNTRANSLATABLE,
    });
    const { getByTestId } = render(<TranslationTab migrationRule={rule} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('translationResultBadge')).toHaveTextContent('Not translated');
  });

  it('renders fully translated rule info callout for full translation', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: MigrationTranslationResult.FULL,
    });
    const { getByTestId } = render(<TranslationTab migrationRule={rule} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('fullyTranslatedRuleInfo')).toBeInTheDocument();
  });

  it('does not render fully translated rule info callout for partial translation', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: MigrationTranslationResult.PARTIAL,
    });
    const { queryByTestId } = render(<TranslationTab migrationRule={rule} />, {
      wrapper: TestProviders,
    });
    expect(queryByTestId('fullyTranslatedRuleInfo')).not.toBeInTheDocument();
  });
});
