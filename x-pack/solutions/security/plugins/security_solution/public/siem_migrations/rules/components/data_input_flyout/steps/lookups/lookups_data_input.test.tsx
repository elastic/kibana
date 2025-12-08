/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { LookupsDataInput } from './lookups_data_input';
import { QradarDataInputStep, SplunkDataInputStep } from '../constants';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';
import { MigrationSource } from '../../../../types';
import { useMissingResources } from '../hooks/use_missing_resources';

const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();
const mockUseMissingResources = useMissingResources as jest.Mock;

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

jest.mock('../hooks/use_missing_resources', () => ({
  useMissingResources: jest.fn().mockReturnValue({
    missingResourcesIndexed: {
      lookups: ['lookup1', 'lookup2'],
    },
  }),
}));

describe('LookupsDataInput', () => {
  const defaultProps = {
    dataInputStep: {
      [MigrationSource.SPLUNK]: SplunkDataInputStep.Lookups,
      [MigrationSource.QRADAR]: QradarDataInputStep.Rules,
    },
    migrationSource: MigrationSource.SPLUNK,
    migrationStats: getRuleMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    setMigrationDataInputStep: jest.fn(),
    onMigrationCreated: jest.fn(),
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
        <LookupsDataInput
          {...defaultProps}
          dataInputStep={{
            [MigrationSource.SPLUNK]: SplunkDataInputStep.Rules,
            [MigrationSource.QRADAR]: QradarDataInputStep.Rules,
          }}
        />
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
    mockUseMissingResources.mockReturnValue({
      missingResourcesIndexed: {
        lookups: undefined,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('lookupsUploadDescription')).not.toBeInTheDocument();
  });
});
