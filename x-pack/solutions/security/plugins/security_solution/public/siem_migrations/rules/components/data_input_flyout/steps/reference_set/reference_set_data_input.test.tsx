/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ReferenceSetDataInput } from './reference_set_data_input';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';
import { MigrationSource, SplunkDataInputStep } from '../../../../../common/types';
import { QradarDataInputStep } from '../../types';

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

describe('ReferenceSetDataInput', () => {
  const defaultProps = {
    dataInputStep: QradarDataInputStep.ReferenceSet,
    migrationSource: MigrationSource.QRADAR,
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
        <ReferenceSetDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('referenceSetsUploadStepNumber')).toBeInTheDocument();
    expect(getByTestId('referenceSetsUploadStepNumber')).toHaveTextContent('Current step is 2');
  });

  it('renders title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ReferenceSetDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('referenceSetsUploadTitle')).toBeInTheDocument();
    expect(getByTestId('referenceSetsUploadTitle')).toHaveTextContent('Upload reference sets');
  });

  it('renders description when step is current', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ReferenceSetDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('referenceSetsUploadDescription')).toBeInTheDocument();
    expect(getByTestId('referenceSetsUploadDescription')).toHaveTextContent(
      `We've also found reference sets within your rules. To fully translate those rules containing these reference sets, follow the step-by-step guide to export and upload them all.`
    );
  });

  it('does not render description when dataInputStep is not LookupsUpload', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ReferenceSetDataInput {...defaultProps} dataInputStep={SplunkDataInputStep.Upload} />
      </TestProviders>
    );
    expect(queryByTestId('referenceSetsUploadDescription')).not.toBeInTheDocument();
  });

  it('does not render description when migrationStats is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ReferenceSetDataInput {...defaultProps} migrationStats={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('referenceSetsUploadDescription')).not.toBeInTheDocument();
  });

  it('does not render description when missingLookups is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ReferenceSetDataInput {...defaultProps} missingResourcesIndexed={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('referenceSetsUploadDescription')).not.toBeInTheDocument();
  });
});
