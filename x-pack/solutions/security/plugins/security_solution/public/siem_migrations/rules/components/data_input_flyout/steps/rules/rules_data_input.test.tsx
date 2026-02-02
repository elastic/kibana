/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RulesDataInput } from './rules_data_input';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { MigrationSource, SplunkDataInputStep } from '../../../../../common/types';

describe('RulesDataInput', () => {
  const defaultProps = {
    migrationStats: undefined,
    onMigrationCreated: jest.fn(),
    dataInputStep: SplunkDataInputStep.Upload,
    migrationSource: MigrationSource.SPLUNK,
    setDataInputStep: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
    missingResourcesIndexed: { lookups: [], macros: [] },
  };

  it('renders the step number', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RulesDataInput {...defaultProps} migrationSource={MigrationSource.SPLUNK} />
      </TestProviders>
    );

    expect(getByTestId('rulesDataInputStepNumber')).toBeInTheDocument();
    expect(getByTestId('rulesDataInputStepNumber')).toHaveTextContent('1');
  });

  it('renders the title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RulesDataInput {...defaultProps} migrationSource={MigrationSource.SPLUNK} />
      </TestProviders>
    );

    expect(getByTestId('rulesDataInputTitle')).toBeInTheDocument();
    expect(getByTestId('rulesDataInputTitle')).toHaveTextContent('Upload rules');
  });

  it('renders sub-steps when the step is current', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RulesDataInput {...defaultProps} migrationSource={MigrationSource.SPLUNK} />
      </TestProviders>
    );

    expect(getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });

  it('does not render sub-steps when the step is not current', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RulesDataInput
          {...defaultProps}
          dataInputStep={SplunkDataInputStep.Macros}
          migrationSource={MigrationSource.SPLUNK}
        />
      </TestProviders>
    );

    expect(queryByTestId('migrationsSubSteps')).not.toBeInTheDocument();
  });
});
