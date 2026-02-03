/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { LookupsDataInput } from './lookups_data_input';
import * as i18n from './translations';
import { getDashboardMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';
import { MigrationSource, SplunkDataInputStep } from '../../../../../common/types';

const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('../../../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        dashboards: {
          api: {},
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
    migrationStats: getDashboardMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    missingResourcesIndexed: { lookups: ['lookup1', 'lookup2'], macros: [] },
    setDataInputStep: jest.fn(),
    migrationSource: MigrationSource.SPLUNK,
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
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
    expect(getByTestId('lookupsUploadStepNumber')).toHaveTextContent('Current step is 33'); // "Current step is 3" + "3"
  });

  it('renders title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('lookupsUploadTitle')).toBeInTheDocument();
    expect(getByTestId('lookupsUploadTitle')).toHaveTextContent(i18n.LOOKUPS_DATA_INPUT_TITLE);
  });

  it('renders description when step is current', () => {
    const { getByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('lookupsUploadDescription')).toBeInTheDocument();
    expect(getByTestId('lookupsUploadDescription')).toHaveTextContent(
      i18n.LOOKUPS_DATA_INPUT_DESCRIPTION
    );
  });

  it('does not render description when dataInputStep is not LookupsUpload', () => {
    const { queryByText } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} dataInputStep={SplunkDataInputStep.Upload} />
      </TestProviders>
    );
    expect(queryByText(i18n.LOOKUPS_DATA_INPUT_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('does not render description when migrationStats is missing', () => {
    const { queryByText } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} migrationStats={undefined} />
      </TestProviders>
    );
    expect(queryByText(i18n.LOOKUPS_DATA_INPUT_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('does not render description when missingLookups is missing', () => {
    const { queryByText } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} missingResourcesIndexed={undefined} />
      </TestProviders>
    );
    expect(queryByText(i18n.LOOKUPS_DATA_INPUT_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('renders sub-steps when step is current and props are provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <LookupsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });
});
