/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { WatchlistsDataInput } from './watchlists_data_input';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';
import { MigrationSource } from '../../../../../common/types';
import { SentinelDataInputStep } from '../../types';

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

describe('WatchlistsDataInput', () => {
  const defaultProps = {
    dataInputStep: SentinelDataInputStep.Watchlists,
    migrationSource: MigrationSource.SENTINEL,
    migrationStats: getRuleMigrationStatsMock({
      status: SiemMigrationTaskStatus.READY,
      vendor: MigrationSource.SENTINEL,
    }),
    setDataInputStep: jest.fn(),
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
    missingResourcesIndexed: { lookups: ['watchlist1', 'watchlist2'], macros: [] },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders step number', () => {
    const { getByTestId } = render(
      <TestProviders>
        <WatchlistsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('watchlistsUploadStepNumber')).toBeInTheDocument();
    expect(getByTestId('watchlistsUploadStepNumber')).toHaveTextContent('Current step is 22');
  });

  it('renders title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <WatchlistsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('watchlistsUploadTitle')).toBeInTheDocument();
    expect(getByTestId('watchlistsUploadTitle')).toHaveTextContent('Upload watchlists');
  });

  it('renders description when step is current', () => {
    const { getByTestId } = render(
      <TestProviders>
        <WatchlistsDataInput {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('watchlistsUploadDescription')).toBeInTheDocument();
    expect(getByTestId('watchlistsUploadDescription')).toHaveTextContent(
      `We've also found watchlists within your rules. To fully translate those rules containing these watchlists, follow the step-by-step guide to export and upload them all.`
    );
  });

  it('does not render description when dataInputStep is not Watchlists', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <WatchlistsDataInput {...defaultProps} dataInputStep={SentinelDataInputStep.Rules} />
      </TestProviders>
    );
    expect(queryByTestId('watchlistsUploadDescription')).not.toBeInTheDocument();
  });

  it('does not render description when migrationStats is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <WatchlistsDataInput {...defaultProps} migrationStats={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('watchlistsUploadDescription')).not.toBeInTheDocument();
  });

  it('does not render description when missingLookups is missing', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <WatchlistsDataInput {...defaultProps} missingResourcesIndexed={undefined} />
      </TestProviders>
    );
    expect(queryByTestId('watchlistsUploadDescription')).not.toBeInTheDocument();
  });
});
