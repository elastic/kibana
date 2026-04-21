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
import * as settingsHooks from '../../../contexts/synthetics_settings_context';
import type { SyntheticsSettingsContextValues } from '../../../contexts';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

const mockSaveSettings = jest.fn();

const mockCCSSettingsData = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [] as string[],
};

jest.mock('./hooks/use_get_ccs_settings', () => ({
  ...jest.requireActual('./hooks/use_get_ccs_settings'),
  useGetCCSSettings: () => ({
    data: mockCCSSettingsData,
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

jest.mock('../../../contexts/synthetics_settings_context', () => ({
  ...jest.requireActual('../../../contexts/synthetics_settings_context'),
  useSyntheticsSettingsContext: jest.fn(),
}));

describe('<RemoteClustersForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (settingsHooks.useSyntheticsSettingsContext as jest.Mock).mockReturnValue({
      isServerless: false,
      isCCSEnabled: true,
    } as SyntheticsSettingsContextValues);
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
    expect(comboBox).toHaveAttribute('disabled');
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
