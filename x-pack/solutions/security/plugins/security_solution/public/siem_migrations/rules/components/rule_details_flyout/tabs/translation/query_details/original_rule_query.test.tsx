/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OriginalRuleQuery } from './original_rule_query';
import { getRuleMigrationRuleMock } from '../../../../../../../../common/siem_migrations/model/__mocks__';
import { TestProviders } from '../../../../../../../common/mock';

describe('OriginalRuleQuery', () => {
  const mockMigrationRule = getRuleMigrationRuleMock();

  it('renders the QueryHeader with the correct title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OriginalRuleQuery migrationRule={mockMigrationRule} />
      </TestProviders>
    );

    expect(getByTestId('headerTitle')).toBeInTheDocument();
    expect(getByTestId('headerTitle')).toHaveTextContent('Splunk query');
  });

  it('renders the horizontal rule', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OriginalRuleQuery migrationRule={mockMigrationRule} />
      </TestProviders>
    );

    expect(getByTestId('queryHorizontalRule')).toBeInTheDocument();
  });

  it('renders the QueryViewer with the correct rule details', () => {
    const { getByText } = render(
      <TestProviders>
        <OriginalRuleQuery migrationRule={mockMigrationRule} />
      </TestProviders>
    );

    expect(getByText(mockMigrationRule.original_rule.title)).toBeInTheDocument();
    expect(getByText(mockMigrationRule.original_rule.query)).toBeInTheDocument();
  });
});
