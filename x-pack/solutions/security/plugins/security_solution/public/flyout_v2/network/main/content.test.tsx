/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { Content } from './content';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { useNetworkDetails } from '../../../explore/network/containers/details';
import { useAnomaliesTableData } from '../../../common/components/ml/anomaly/use_anomalies_table_data';
import { useInstalledSecurityJobNameById } from '../../../common/components/ml/hooks/use_installed_security_jobs';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';

vi.mock('../../../explore/network/components/details', () => {
      const mocked = {
      IpOverview: () => <div data-test-subj="ip-overview" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/components/empty_prompt', () => {
      const mocked = {
      EmptyPrompt: () => <div data-test-subj="empty-prompt" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/components/page_loader', () => {
      const mocked = {
      PageLoader: () => <div data-test-subj="page-loader" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../explore/network/containers/details');
vi.mock('../../../common/components/ml/anomaly/use_anomalies_table_data');
vi.mock('../../../common/components/ml/hooks/use_installed_security_jobs');
vi.mock('../../../common/containers/use_global_time');
vi.mock('../../../data_view_manager/hooks/use_data_view');
vi.mock('../../../data_view_manager/hooks/use_selected_patterns');
vi.mock('../../../common/hooks/use_invalid_filter_query');
vi.mock('../../../common/lib/kuery', () => {
      const mocked = {
      convertToBuildEsQuery: vi.fn().mockReturnValue([undefined, undefined]),
    };
      return { ...mocked, default: mocked };
    });

const mockUseNetworkDetails = useNetworkDetails as Mock;
const mockUseAnomaliesTableData = useAnomaliesTableData as Mock;
const mockUseInstalledSecurityJobNameById = useInstalledSecurityJobNameById as Mock;
const mockUseGlobalTime = useGlobalTime as Mock;
const mockUseDataView = useDataView as Mock;
const mockUseSelectedPatterns = useSelectedPatterns as Mock;

const defaultProps = {
  ip: '192.168.1.1',
  flowTarget: FlowTargetSourceDest.destination,
};

describe('<Content />', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGlobalTime.mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      to: '2020-07-08T08:20:18.966Z',
      isInitializing: false,
      setQuery: vi.fn(),
    });

    mockUseNetworkDetails.mockReturnValue([false, { id: 'test-id', networkDetails: {} }]);

    mockUseAnomaliesTableData.mockReturnValue([false, null]);

    mockUseInstalledSecurityJobNameById.mockReturnValue({
      loading: false,
      jobNameById: {},
    });

    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: [] },
      status: 'ready',
    });

    mockUseSelectedPatterns.mockReturnValue([]);
  });

  it('should render PageLoader status is pristine', () => {
    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: [] },
      status: 'pristine',
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('page-loader')).toBeInTheDocument();
    expect(queryByTestId('ip-overview')).not.toBeInTheDocument();
    expect(queryByTestId('empty-prompt')).not.toBeInTheDocument();
  });

  it('should use experimental data view indices when we have selected patterns', () => {
    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: ['logs-*'] },
      status: 'ready',
    });
    mockUseSelectedPatterns.mockReturnValue(['logs-*']);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('ip-overview')).toBeInTheDocument();
    expect(queryByTestId('empty-prompt')).not.toBeInTheDocument();
  });

  it('should render EmptyPrompt when no matched indices', () => {
    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: [] },
      status: 'ready',
    });
    mockUseSelectedPatterns.mockReturnValue([]);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('empty-prompt')).toBeInTheDocument();
    expect(queryByTestId('ip-overview')).not.toBeInTheDocument();
  });
});
