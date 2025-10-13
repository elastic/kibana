/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { DetectionResponse } from './detection_response';
import { TestProviders } from '../../common/mock';
import { noCasesPermissions, readCasesPermissions } from '../../cases_test_utils';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { getMockDataViewWithMatchedIndices } from '../../data_view_manager/mocks/mock_data_view';
import { defaultImplementation } from '../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('../components/detection_response/alerts_by_status', () => ({
  AlertsByStatus: () => <div data-test-subj="mock_AlertsByStatus" />,
}));

jest.mock('../components/detection_response/cases_table', () => ({
  CasesTable: () => <div data-test-subj="mock_CasesTable" />,
}));

jest.mock('../components/detection_response/host_alerts_table', () => ({
  HostAlertsTable: () => <div data-test-subj="mock_HostAlertsTable" />,
}));

jest.mock('../components/detection_response/rule_alerts_table', () => ({
  RuleAlertsTable: () => <div data-test-subj="mock_RuleAlertsTable" />,
}));

jest.mock('../components/detection_response/user_alerts_table', () => ({
  UserAlertsTable: () => <div data-test-subj="mock_UserAlertsTable" />,
}));

jest.mock('../components/detection_response/cases_by_status', () => ({
  CasesByStatus: () => <div data-test-subj="mock_CasesByStatus" />,
}));

jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: () => <div data-test-subj="mock_globalSearchBar" />,
}));

jest.mock('../../common/components/filters_global', () => ({
  FiltersGlobal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../common/components/empty_prompt');

const defaultUseAlertsPrivilegesReturn = {
  hasAlertsRead: true,
  hasIndexRead: true,
};

const defaultUseSignalIndexReturn = {
  signalIndexName: '',
};

const mockUseSignalIndex = jest.fn(() => defaultUseSignalIndexReturn);
jest.mock('../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => mockUseSignalIndex(),
}));
const mockUseAlertsPrivileges = jest.fn(() => defaultUseAlertsPrivilegesReturn);
jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: () => mockUseAlertsPrivileges(),
}));

const defaultUseCasesPermissionsReturn = readCasesPermissions();

const mockedUseKibana = mockUseKibana();
const mockCanUseCases = jest.fn();

jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          helpers: { canUseCases: mockCanUseCases },
        },
      },
    }),
  };
});

describe('DetectionResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlertsPrivileges.mockReturnValue(defaultUseAlertsPrivilegesReturn);
    mockUseSignalIndex.mockReturnValue(defaultUseSignalIndexReturn);
    mockCanUseCases.mockReturnValue(defaultUseCasesPermissionsReturn);
    jest
      .mocked(useDataView)
      .mockReturnValue({ dataView: getMockDataViewWithMatchedIndices(), status: 'ready' });
  });

  it('should render default page', () => {
    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_globalSearchBar')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseSections')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseLoader')).not.toBeInTheDocument();
    expect(result.getByText('Detection & Response')).toBeInTheDocument();
  });

  it('should render landing page if index not exist', () => {
    jest.mocked(useDataView).mockImplementation(defaultImplementation);

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.getByTestId('empty-prompt')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponsePage')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_globalSearchBar')).not.toBeInTheDocument();
  });

  it('should render loader if dataview is loading', () => {
    jest
      .mocked(useDataView)
      .mockReturnValue({ dataView: getMockDataViewWithMatchedIndices(), status: 'loading' });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_globalSearchBar')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseLoader')).toBeInTheDocument();
    expect(result.queryByTestId('detectionResponseSections')).not.toBeInTheDocument();
  });

  it('should not render alerts data sections if user has not index read permission', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexRead: false,
      hasAlertsRead: true,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_CasesTable')).toBeInTheDocument();
    expect(result.queryByTestId('mock_CasesByStatus')).toBeInTheDocument();

    expect(result.queryByTestId('mock_RuleAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_HostAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_UserAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_AlertsByStatus')).not.toBeInTheDocument();
  });

  it('should not render alerts data sections if user has not kibana read permission', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexRead: true,
      hasAlertsRead: false,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_CasesTable')).toBeInTheDocument();
    expect(result.queryByTestId('mock_CasesByStatus')).toBeInTheDocument();

    expect(result.queryByTestId('mock_RuleAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_HostAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_UserAlertsTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_AlertsByStatus')).not.toBeInTheDocument();
  });

  it('should not render cases data sections if the user does not have cases read permission', () => {
    mockCanUseCases.mockReturnValue(noCasesPermissions());

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('mock_CasesTable')).not.toBeInTheDocument();
    expect(result.queryByTestId('mock_CasesByStatus')).not.toBeInTheDocument();

    expect(result.queryByTestId('detectionResponsePage')).toBeInTheDocument();
    expect(result.queryByTestId('mock_RuleAlertsTable')).toBeInTheDocument();
    expect(result.queryByTestId('mock_HostAlertsTable')).toBeInTheDocument();
    expect(result.queryByTestId('mock_UserAlertsTable')).toBeInTheDocument();
    expect(result.queryByTestId('mock_AlertsByStatus')).toBeInTheDocument();
  });

  it('should render page permissions message if the user does not have read permission', () => {
    mockCanUseCases.mockReturnValue(noCasesPermissions());
    mockUseAlertsPrivileges.mockReturnValue({
      hasAlertsRead: true,
      hasIndexRead: false,
    });

    const result = render(
      <TestProviders>
        <MemoryRouter>
          <DetectionResponse />
        </MemoryRouter>
      </TestProviders>
    );

    expect(result.queryByTestId('detectionResponsePage')).not.toBeInTheDocument();
    expect(result.queryByTestId('noPrivilegesPage')).toBeInTheDocument();
  });
});
