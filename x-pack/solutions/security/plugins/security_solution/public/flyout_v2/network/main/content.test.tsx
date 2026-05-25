/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { Content } from './content';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { useNetworkDetails } from '../../../explore/network/containers/details';
import { useAnomaliesTableData } from '../../../common/components/ml/anomaly/use_anomalies_table_data';
import { useInstalledSecurityJobNameById } from '../../../common/components/ml/hooks/use_installed_security_jobs';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';

jest.mock('../../../explore/network/components/details', () => ({
  IpOverview: () => <div data-test-subj="ip-overview" />,
}));

jest.mock('../../../common/components/empty_prompt', () => ({
  EmptyPrompt: () => <div data-test-subj="empty-prompt" />,
}));

jest.mock('../../../common/components/page_loader', () => ({
  PageLoader: () => <div data-test-subj="page-loader" />,
}));

jest.mock('../../../explore/network/containers/details');
jest.mock('../../../common/components/ml/anomaly/use_anomalies_table_data');
jest.mock('../../../common/components/ml/hooks/use_installed_security_jobs');
jest.mock('../../../sourcerer/containers');
jest.mock('../../../common/containers/use_global_time');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../data_view_manager/hooks/use_selected_patterns');
jest.mock('../../../common/hooks/use_invalid_filter_query');
jest.mock('../../../common/lib/kuery', () => ({
  convertToBuildEsQuery: jest.fn().mockReturnValue([undefined, undefined]),
}));

const mockUseNetworkDetails = useNetworkDetails as jest.Mock;
const mockUseAnomaliesTableData = useAnomaliesTableData as jest.Mock;
const mockUseInstalledSecurityJobNameById = useInstalledSecurityJobNameById as jest.Mock;
const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
const mockUseGlobalTime = useGlobalTime as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseDataView = useDataView as jest.Mock;
const mockUseSelectedPatterns = useSelectedPatterns as jest.Mock;

const defaultProps = {
  ip: '192.168.1.1',
  flowTarget: FlowTargetSourceDest.destination,
};

describe('<Content />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGlobalTime.mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      to: '2020-07-08T08:20:18.966Z',
      isInitializing: false,
      setQuery: jest.fn(),
    });

    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      sourcererDataView: {},
      selectedPatterns: ['auditbeat-*'],
    });

    mockUseNetworkDetails.mockReturnValue([false, { id: 'test-id', networkDetails: {} }]);

    mockUseAnomaliesTableData.mockReturnValue([false, null]);

    mockUseInstalledSecurityJobNameById.mockReturnValue({
      loading: false,
      jobNameById: {},
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: [] },
      status: 'ready',
    });

    mockUseSelectedPatterns.mockReturnValue([]);
  });

  it('should render IpOverview when indices exist', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('ip-overview')).toBeInTheDocument();
    expect(queryByTestId('empty-prompt')).not.toBeInTheDocument();
  });

  it('should render EmptyPrompt when indices do not exist', () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: false,
      sourcererDataView: {},
      selectedPatterns: [],
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('empty-prompt')).toBeInTheDocument();
    expect(queryByTestId('ip-overview')).not.toBeInTheDocument();
  });

  it('should render PageLoader when newDataViewPickerEnabled is true and status is pristine', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
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

  it('should use experimental data view indices when newDataViewPickerEnabled is true', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: ['logs-*'] },
      status: 'ready',
    });
    mockUseSelectedPatterns.mockReturnValue(['logs-*']);
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: false,
      sourcererDataView: {},
      selectedPatterns: [],
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('ip-overview')).toBeInTheDocument();
    expect(queryByTestId('empty-prompt')).not.toBeInTheDocument();
  });

  it('should render EmptyPrompt when newDataViewPickerEnabled is true and no matched indices', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    mockUseDataView.mockReturnValue({
      dataView: { matchedIndices: [] },
      status: 'ready',
    });
    mockUseSelectedPatterns.mockReturnValue([]);
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      sourcererDataView: {},
      selectedPatterns: ['auditbeat-*'],
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Content {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('empty-prompt')).toBeInTheDocument();
    expect(queryByTestId('ip-overview')).not.toBeInTheDocument();
  });
});
