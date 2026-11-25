/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import type { GetSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { render } from '../../utils/test_helper';
import { useGetGlobalSettings } from './hooks/use_get_global_settings';
import { SloSettingsPage } from './slo_settings';

const mockHistoryPush = jest.fn();
let mockPathname = '/settings';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
    location: { pathname: mockPathname, search: '', hash: '' },
    listen: jest.fn(),
    replace: jest.fn(),
  }),
  Redirect: ({ to }: { to: string }) => <div data-test-subj="redirect">{to}</div>,
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useBreadcrumbs: jest.fn(),
}));
jest.mock('../../hooks/use_kibana');
jest.mock('./hooks/use_get_global_settings');
jest.mock('./settings_form', () => ({
  SettingsForm: () => <div data-test-subj="spaceSettingsForm" />,
}));
jest.mock('./components/global_settings_form', () => ({
  GlobalSettingsForm: () => <div data-test-subj="globalSettingsForm" />,
}));

const useKibanaMock = useKibana as jest.Mock;
const useGetGlobalSettingsMock = useGetGlobalSettings as jest.Mock;

const globalSettings: GetSLOGlobalSettingsResponse = {
  sliRetention: {
    enabled: false,
    periodDays: 365,
    updatedAt: null,
    effective: { enabled: false, periodDays: 365, source: 'default' },
  },
};

describe('SloSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/settings';
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { prepend: (path: string) => path } },
        serverless: undefined,
        inspector: { open: jest.fn() },
        uiSettings: { get: () => false },
        docLinks: { links: { observability: { slo: 'dummy_link' } } },
      },
    });
  });

  describe('when the user can read the global settings', () => {
    beforeEach(() => {
      useGetGlobalSettingsMock.mockReturnValue({
        data: globalSettings,
        isLoading: false,
        isError: false,
      });
    });

    it('renders the Space and Global tabs with the Space form selected', () => {
      render(<SloSettingsPage />);

      expect(screen.getByTestId('sloSettingsTabSpace')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('sloSettingsTabGlobal')).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByTestId('spaceSettingsForm')).toBeInTheDocument();
      expect(screen.queryByTestId('globalSettingsForm')).not.toBeInTheDocument();
    });

    it('navigates to the global settings when the Global tab is clicked', () => {
      render(<SloSettingsPage />);

      fireEvent.click(screen.getByTestId('sloSettingsTabGlobal'));

      expect(mockHistoryPush).toHaveBeenCalledWith('/settings/global');
    });

    it('navigates to the space settings when the Space tab is clicked', () => {
      mockPathname = '/settings/global';
      render(<SloSettingsPage />);

      fireEvent.click(screen.getByTestId('sloSettingsTabSpace'));

      expect(mockHistoryPush).toHaveBeenCalledWith('/settings');
    });

    it('renders the global settings form on the global settings path', () => {
      mockPathname = '/settings/global';
      render(<SloSettingsPage />);

      expect(screen.getByTestId('sloSettingsTabGlobal')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('globalSettingsForm')).toBeInTheDocument();
      expect(screen.queryByTestId('spaceSettingsForm')).not.toBeInTheDocument();
    });
  });

  describe('when the global settings request fails', () => {
    beforeEach(() => {
      useGetGlobalSettingsMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
    });

    it('hides the tabs and renders the Space form', () => {
      render(<SloSettingsPage />);

      expect(screen.queryByTestId('sloSettingsTabSpace')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sloSettingsTabGlobal')).not.toBeInTheDocument();
      expect(screen.getByTestId('spaceSettingsForm')).toBeInTheDocument();
    });

    it('redirects the global settings path to the space settings', () => {
      mockPathname = '/settings/global';
      render(<SloSettingsPage />);

      expect(screen.getByTestId('redirect')).toHaveTextContent('/settings');
      expect(screen.queryByTestId('globalSettingsForm')).not.toBeInTheDocument();
    });
  });

  it('renders a loading state on the global settings path while the request is pending', () => {
    mockPathname = '/settings/global';
    useGetGlobalSettingsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(<SloSettingsPage />);

    expect(screen.getByTestId('sloGlobalSettingsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('globalSettingsForm')).not.toBeInTheDocument();
  });
});
