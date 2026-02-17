/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MacrosDataInput } from './macros_data_input';
import { getRuleMigrationStatsMock } from '../../../../__mocks__';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../../../common/mock';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../../common/hooks/use_app_toasts.mock';
import type { MigrationStepProps } from '../../../../../common/types';
import { MigrationSource, SplunkDataInputStep } from '../../../../../common/types';

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
jest.mock('../../../../../../common/hooks/use_app_toasts');

jest.mock('../../../../../common/hooks/use_missing_resources', () => ({
  useMissingResources: jest.fn().mockReturnValue({
    missingResourcesIndexed: {
      macros: ['macro1', 'macro2'],
      lookups: [],
    },
    onMissingResourcesFetched: jest.fn(),
  }),
}));

jest.mock('../../../../../../common/experimental_features_service', () => ({
  ExperimentalFeaturesService: {
    get: () => ({
      splunkV2DashboardsEnabled: false,
    }),
  },
}));

describe('MacrosDataInput', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  const defaultProps: MigrationStepProps = {
    dataInputStep: SplunkDataInputStep.Macros,
    migrationSource: MigrationSource.SPLUNK,
    migrationStats: getRuleMigrationStatsMock({ status: SiemMigrationTaskStatus.READY }),
    missingResourcesIndexed: { macros: ['macro1', 'macro2'], lookups: [] },
    onMigrationCreated: jest.fn(),
    onMissingResourcesFetched: jest.fn(),
    setDataInputStep: jest.fn(),
  };

  beforeEach(() => {
    appToastsMock = useAppToastsMock.create();
    jest.mocked(useAppToasts).mockReturnValue(appToastsMock);
  });

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
    expect(getByTestId('macrosUploadStepNumber')).toHaveTextContent('Current step is 22'); // "Current step is 2" + "2"
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
        <MacrosDataInput {...defaultProps} dataInputStep={SplunkDataInputStep.Upload} />
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
        <MacrosDataInput {...defaultProps} missingResourcesIndexed={undefined} />
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

  it('shows a warning toast if uploaded file does not contain any of the missing macros', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <MacrosDataInput {...defaultProps} />
      </TestProviders>
    );

    const fileContent =
      '[{"result":{"name":"other_macro","definition":"`other_index`","iseval":"false"}}]';
    const file = new File([fileContent], 'macros.json', { type: 'application/json' });

    const filePicker = getByTestId('macrosFilePicker');
    await act(async () => {
      fireEvent.change(filePicker, { target: { files: [file] } });
    });

    const uploadButton = getByTestId('uploadFileButton');
    expect(uploadButton).not.toBeDisabled();

    await act(async () => {
      if (uploadButton) {
        fireEvent.click(uploadButton);
      }
    });

    expect(appToastsMock.addWarning).toHaveBeenCalledWith({
      title: 'No relevant macros found.',
    });
  });
});
