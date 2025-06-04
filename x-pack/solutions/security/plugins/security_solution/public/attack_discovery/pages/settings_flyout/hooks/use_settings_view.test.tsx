/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useSettingsView } from './use_settings_view';
import { TestProviders } from '../../../../common/mock';

const mockFilterManager = createFilterManagerMock();

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../sourcerer/containers');
jest.mock('../../../../common/hooks/use_space_id', () => {
  return {
    useSpaceId: jest.fn().mockReturnValue('default'),
  };
});

const defaultProps = {
  connectorId: undefined,
  onConnectorIdSelected: jest.fn(),
  onSettingsChanged: jest.fn(),
  onSettingsReset: jest.fn(),
  onSettingsSave: jest.fn(),
  settings: {
    end: 'now',
    filters: [],
    query: { query: '', language: 'kuery' },
    size: 100,
    start: 'now-15m',
  },
  showConnectorSelector: true,
  stats: null,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView: jest.MockedFunction<typeof useSourcererDataView> =
  useSourcererDataView as jest.MockedFunction<typeof useSourcererDataView>;

describe('useSettingsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: mockFilterManager,
          },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);
  });

  it('should return the alert selection component with `AlertSelectionQuery` as settings view', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps));

    render(<TestProviders>{result.current.settingsView}</TestProviders>);

    expect(screen.getByTestId('customizeAlerts')).toBeInTheDocument();
  });

  it('should return the alert selection component with `AlertSelectionRange` as settings view', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps));

    render(<TestProviders>{result.current.settingsView}</TestProviders>);

    expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
  });

  it('should return reset action button', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('should return save action button', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).toBeInTheDocument();
  });

  it('when the save button is clicked - invokes onSettingsSave', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    const save = screen.getByTestId('save');
    fireEvent.click(save);

    expect(defaultProps.onSettingsSave).toHaveBeenCalled();
  });

  it('when the reset button is clicked - invokes onSettingsReset', () => {
    const { result } = renderHook(() => useSettingsView(defaultProps));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    const reset = screen.getByTestId('reset');
    fireEvent.click(reset);

    expect(defaultProps.onSettingsReset).toHaveBeenCalled();
  });
});
