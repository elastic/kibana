/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { LookupsDataInput } from './lookups_data_input';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';
import { MigrationSource, SplunkDataInputStep } from '../../../../../common/types';

const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('../../../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: {
          api: {},
          telemetry: {
            reportSetupLookupNameCopied: jest.fn(),
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

describe('LookupsDataInput', () => {
  const defaultProps = {
    dataInputStep: SplunkDataInputStep.Lookups,
    migrationSource: MigrationSource.SPLUNK,
    migrationStats: getRuleMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    setDataInputStep: jest.fn(),
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
    missingResourcesIndexed: { lookups: ['lookup1', 'lookup2'], macros: [] },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders step number', () => {
    const { getByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('lookupsUploadStepNumber')).toBeInTheDocument();
    expect(getByTestId('lookupsUploadStepNumber')).toHaveTextContent('Current step is 33');
  });

  it('renders title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('lookupsUploadTitle')).toBeInTheDocument();
    expect(getByTestId('lookupsUploadTitle')).toHaveTextContent('Upload lookups');
  });

  it('renders description when step is current', () => {
    const { getByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('lookupsUploadDescription')).toBeInTheDocument();
    expect(getByTestId('lookupsUploadDescription')).toHaveTextContent(
      `We've also found lookups within your rules. To fully translate those rules containing these lookups, follow the step-by-step guide to export and upload them all.`
    );
  });

  it('does not render description when dataInputStep is not LookupsUpload', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} dataInputStep={SplunkDataInputStep.Upload} />
      </TestProviders>
    );
    expect(queryByTestId('lookupsUploadDescription')).not.toBeInTheDocument();
  });

  it('does not render description when migrationStats is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} migrationStats={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('lookupsUploadDescription')).not.toBeInTheDocument();
  });

  it('does not render description when missingLookups is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} missingResourcesIndexed={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('lookupsUploadDescription')).not.toBeInTheDocument();
  });
});
