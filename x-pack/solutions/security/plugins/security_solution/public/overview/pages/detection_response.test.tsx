/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

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

vi.mock('../components/detection_response/alerts_by_status', () => {
      const mocked = {
      AlertsByStatus: () => <div data-test-subj="mock_AlertsByStatus" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/detection_response/cases_table', () => {
      const mocked = {
      CasesTable: () => <div data-test-subj="mock_CasesTable" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/detection_response/host_alerts_table', () => {
      const mocked = {
      HostAlertsTable: () => <div data-test-subj="mock_HostAlertsTable" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/detection_response/rule_alerts_table', () => {
      const mocked = {
      RuleAlertsTable: () => <div data-test-subj="mock_RuleAlertsTable" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/detection_response/user_alerts_table', () => {
      const mocked = {
      UserAlertsTable: () => <div data-test-subj="mock_UserAlertsTable" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/detection_response/cases_by_status', () => {
      const mocked = {
      CasesByStatus: () => <div data-test-subj="mock_CasesByStatus" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/components/search_bar', () => {
      const mocked = {
      SiemSearchBar: () => <div data-test-subj="mock_globalSearchBar" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/components/filters_global', () => {
      const mocked = {
      FiltersGlobal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/components/empty_prompt');

const defaultUseAlertsPrivilegesReturn = {
  hasAlertsRead: true,
  hasIndexRead: true,
};

const defaultUseSignalIndexReturn = {
  signalIndexName: '',
};

const mockUseSignalIndex = vi.fn(() => defaultUseSignalIndexReturn);
vi.mock('../../detections/containers/detection_engine/alerts/use_signal_index', () => {
      const mocked = {
      useSignalIndex: () => mockUseSignalIndex(),
    };
      return { ...mocked, default: mocked };
    });
const mockUseAlertsPrivileges = vi.fn(() => defaultUseAlertsPrivilegesReturn);
vi.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => {
      const mocked = {
      useAlertsPrivileges: () => mockUseAlertsPrivileges(),
    };
      return { ...mocked, default: mocked };
    });

const defaultUseCasesPermissionsReturn = readCasesPermissions();

const mockedUseKibana = mockUseKibana();
const mockCanUseCases = vi.fn();

vi.mock('../../common/lib/kibana', async () => {
  const original = (await vi.importActual('../../common/lib/kibana'));

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
    vi.clearAllMocks();
    mockUseAlertsPrivileges.mockReturnValue(defaultUseAlertsPrivilegesReturn);
    mockUseSignalIndex.mockReturnValue(defaultUseSignalIndexReturn);
    mockCanUseCases.mockReturnValue(defaultUseCasesPermissionsReturn);
    vi
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
    vi.mocked(useDataView).mockImplementation(defaultImplementation);

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
    vi
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
    expect(result.queryByTestId('mock_globalSearchBar')).not.toBeInTheDocument();
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
