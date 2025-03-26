/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';

import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useSettingsView } from './use_settings_view';
import { TestProviders } from '../../../../common/mock';

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../sourcerer/containers');

const defaultProps = {
  end: undefined,
  filters: undefined,
  localStorageAttackDiscoveryMaxAlerts: undefined,
  onClose: jest.fn(),
  query: undefined,
  setEnd: jest.fn(),
  setFilters: jest.fn(),
  setLocalStorageAttackDiscoveryMaxAlerts: jest.fn(),
  setQuery: jest.fn(),
  setStart: jest.fn(),
  start: undefined,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

describe('useSettingsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
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
    const { result } = renderHook(() => useSettingsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.settingsView}</TestProviders>);

    expect(screen.getByTestId('customizeAlerts')).toBeInTheDocument();
  });

  it('should return the alert selection component with `AlertSelectionRange` as settings view', () => {
    const { result } = renderHook(() => useSettingsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.settingsView}</TestProviders>);

    expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
  });

  it('should return reset action button', () => {
    const { result } = renderHook(() => useSettingsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('should return save action button', () => {
    const { result } = renderHook(() => useSettingsView({ filterSettings: defaultProps }));

    render(<TestProviders>{result.current.actionButtons}</TestProviders>);

    expect(screen.getByTestId('save')).toBeInTheDocument();
  });

  describe('when the save button is clicked', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSettingsView({ filterSettings: defaultProps }));

      render(<TestProviders>{result.current.actionButtons}</TestProviders>);

      const save = screen.getByTestId('save');
      fireEvent.click(save);
    });

    it('invokes setEnd', () => {
      expect(defaultProps.setEnd).toHaveBeenCalled();
    });

    it('invokes setFilters', () => {
      expect(defaultProps.setFilters).toHaveBeenCalled();
    });

    it('invokes setQuery', () => {
      expect(defaultProps.setQuery).toHaveBeenCalled();
    });

    it('invokes setStart', () => {
      expect(defaultProps.setStart).toHaveBeenCalled();
    });

    it('invokes setLocalStorageAttackDiscoveryMaxAlerts', () => {
      expect(defaultProps.setLocalStorageAttackDiscoveryMaxAlerts).toHaveBeenCalled();
    });

    it('invokes onClose', () => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
