/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import { screen, fireEvent } from '@testing-library/react';
import { RemoteClustersForm } from './remote_clusters_form';
import { render } from '../../../utils/testing';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

const mockSaveSettings = jest.fn();

jest.mock('./hooks/use_get_ccs_settings', () => ({
  ...jest.requireActual('./hooks/use_get_ccs_settings'),
  useGetCCSSettings: () => ({
    data: {
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
      remoteKibanaUrls: {},
    },
    loading: false,
    error: undefined,
  }),
}));

jest.mock('./hooks/use_put_ccs_settings', () => ({
  usePutCCSSettings: () => ({
    saveSettings: mockSaveSettings,
    isSaving: false,
  }),
}));

const mockRemoteClusters = [
  { name: 'cluster-a', isConnected: true },
  { name: 'cluster-b', isConnected: false },
];

describe('<RemoteClustersForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithClusters = (clusters = mockRemoteClusters) => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      data: clusters,
      status: observabilitySharedPublic.FETCH_STATUS.SUCCESS,
      loading: false,
      refetch: () => {},
    });
    return render(<RemoteClustersForm />);
  };

  it('renders the form with toggle and cluster selector', () => {
    renderWithClusters();

    expect(screen.getByTestId('syntheticsUseAllRemoteClusters')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsSelectRemoteClusters')).toBeInTheDocument();
  });

  it('shows a warning callout when no remote clusters are available', () => {
    renderWithClusters([]);

    expect(screen.getByText(/No remote clusters configured/)).toBeInTheDocument();
    expect(screen.getByText(/configure remote clusters in Stack Management/)).toBeInTheDocument();
  });

  it('disables the combo box when "Use all remote clusters" is toggled on', () => {
    renderWithClusters();

    const toggle = screen.getByTestId('syntheticsUseAllRemoteClusters');
    fireEvent.click(toggle);

    const comboBox = screen.getByTestId('syntheticsSelectRemoteClusters');
    expect(comboBox).toBeDisabled();
  });

  it('shows the Kibana URL table when clusters are selected', () => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      data: mockRemoteClusters,
      status: observabilitySharedPublic.FETCH_STATUS.SUCCESS,
      refetch: () => {},
    });

    // Toggle "use all" to show URLs for all clusters
    render(<RemoteClustersForm />);
    const toggle = screen.getByTestId('syntheticsUseAllRemoteClusters');
    fireEvent.click(toggle);

    expect(screen.getByText('cluster-a')).toBeInTheDocument();
    expect(screen.getByText('cluster-b')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsRemoteClusterUrl-cluster-a')).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsRemoteClusterUrl-cluster-b')).toBeInTheDocument();
  });

  it('shows connection status for remote clusters', () => {
    renderWithClusters();

    const toggle = screen.getByTestId('syntheticsUseAllRemoteClusters');
    fireEvent.click(toggle);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('enables the Apply button only when form is dirty', () => {
    renderWithClusters();

    const applyButton = screen.getByTestId('syntheticsCCSSettingsApplyButton');
    expect(applyButton).toBeDisabled();

    const toggle = screen.getByTestId('syntheticsUseAllRemoteClusters');
    fireEvent.click(toggle);

    expect(applyButton).not.toBeDisabled();
  });
});
