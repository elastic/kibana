/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../../../common/mock';
import { getRuleMigrationRuleMock } from '../../../../../../../../common/siem_migrations/model/__mocks__';
import { TranslatedRuleQuery } from './translated_rule_query';
import { getRulesEqlSchemaMock } from '../../../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';

describe('TranslatedRuleQuery', () => {
  it('renders viewer mode by default with custom translation', () => {
    const mockRule = getRuleMigrationRuleMock({
      elastic_rule: {
        title: 'Test Rule',
        query: 'test esql query',
        query_language: 'esql',
      },
    });
    const { getByTestId } = render(
      <TestProviders>
        <TranslatedRuleQuery migrationRule={mockRule} />
      </TestProviders>
    );

    expect(getByTestId('queryHeader')).toBeInTheDocument();
    expect(getByTestId('queryHeader')).toHaveTextContent('ES|QL translation');

    expect(getByTestId('queryViewerTitle')).toBeInTheDocument();
    expect(getByTestId('queryViewerTitle')).toHaveTextContent('Test Rule');

    expect(getByTestId('translatedRuleQueryViewer')).toBeInTheDocument();
    expect(getByTestId('translatedRuleQueryViewer')).toHaveTextContent('test esql query');
  });

  it('switches to edit mode when edit button is clicked', async () => {
    const mockRule = getRuleMigrationRuleMock();
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <TranslatedRuleQuery migrationRule={mockRule} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('editTranslatedRuleButton'));

    await waitFor(() => {
      expect(queryByTestId('ruleMigrationTranslationTab')).toBeInTheDocument();
    });
  });

  it('switches to view mode when cancel button is clicked in edit mode', async () => {
    const mockRule = getRuleMigrationRuleMock();
    const { getByTestId, getByText, queryByTestId } = render(
      <TestProviders>
        <TranslatedRuleQuery migrationRule={mockRule} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('editTranslatedRuleButton'));

    await waitFor(() => {
      expect(queryByTestId('ruleMigrationTranslationTab')).toBeInTheDocument();
    });

    fireEvent.click(getByText('Cancel'));

    await waitFor(() => {
      expect(queryByTestId('queryViewerTitle')).toBeInTheDocument();
    });
  });

  it('displays prebuilt rule information when matched', () => {
    const mockRule = getRuleMigrationRuleMock();
    const matchedPrebuiltRule = {
      ...getRulesEqlSchemaMock(),
      id: 'prebuilt-1',
      name: 'Prebuilt Rule Name',
    };

    const { getByTestId } = render(
      <TestProviders>
        <TranslatedRuleQuery migrationRule={mockRule} matchedPrebuiltRule={matchedPrebuiltRule} />
      </TestProviders>
    );

    expect(getByTestId('headerTitle')).toHaveTextContent('Mapped to Elastic authored EQL rule');
    expect(getByTestId('queryViewerTitle')).toHaveTextContent('Prebuilt Rule Name');
    expect(getByTestId('translatedRuleQueryViewer')).toHaveTextContent('process where true');
  });
});
