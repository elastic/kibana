/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { MacrosDataInput } from './macros_data_input';
import { DataInputStep } from '../constants';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';

const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();
const mockReportSetupMacrosQueryCopied = jest.fn();

jest.mock('../../../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: {
          api: {},
          telemetry: {
            reportSetupMacrosQueryCopied: mockReportSetupMacrosQueryCopied,
          },
        },
      },
      notifications: {
        toasts: {
          addError: mockAddError,
          addSuccess: mockAddSuccess,
        },
      },
    },
  }),
}));

describe('MacrosDataInput', () => {
  const defaultProps = {
    onMissingResourcesFetched: jest.fn(),
    dataInputStep: DataInputStep.Macros,
    migrationStats: getRuleMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    missingMacros: ['macro1', 'macro2'],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders step number', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('macrosUploadStepNumber')).toBeInTheDocument();
    expect(getByTestId('macrosUploadStepNumber')).toHaveTextContent('Current step is 22');
  });

  it('renders title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('macrosUploadTitle')).toBeInTheDocument();
    expect(getByTestId('macrosUploadTitle')).toHaveTextContent('Upload macros');
  });

  it('does not render sub-steps when dataInputStep is not MacrosUpload', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} dataInputStep={DataInputStep.Rules} />
      </TestProviders>
    );
    expect(queryByTestId('migrationsSubSteps')).not.toBeInTheDocument();
  });

  it('does not render sub-steps when migrationStats is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} migrationStats={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('migrationsSubSteps')).not.toBeInTheDocument();
  });

  it('does not render sub-steps when missingMacros is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} missingMacros={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('migrationsSubSteps')).not.toBeInTheDocument();
  });

  it('renders sub-steps when step is current and props are provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });
});
