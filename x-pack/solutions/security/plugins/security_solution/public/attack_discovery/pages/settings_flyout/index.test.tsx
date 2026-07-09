/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SettingsFlyout } from '.';
import { ATTACK_DISCOVERY_SCHEDULE, ATTACK_DISCOVERY_SETTINGS } from './translations';
import { getDefaultQuery } from '../helpers';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { SCHEDULE_TAB_ID, SETTINGS_TAB_ID } from './constants';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/lib/kibana');
jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));

const mockFilter = {
  meta: {
    disabled: false,
    negate: false,
    alias: null,
    index: 'f06caf10-dfc1-4669-8f38-d11e4fcfc8af',
    key: 'host.name',
    field: 'host.name',
    params: {
      query: 'Host1',
    },
    type: 'phrase',
  },
  query: {
    match_phrase: {
      'host.name': 'Host1',
    },
  },
};

const createMockProps = (overrides = {}) => ({
  connectorId: 'test-connector-id',
  end: undefined,
  filters: undefined,
  localStorageAttackDiscoveryMaxAlerts: undefined,
  onClose: jest.fn(),
  onConnectorIdSelected: jest.fn(),
  onGenerate: jest.fn(),
  query: undefined,
  setEnd: jest.fn(),
  setFilters: jest.fn(),
  setLocalStorageAttackDiscoveryMaxAlerts: jest.fn(),
  setQuery: jest.fn(),
  setStart: jest.fn(),
  start: undefined,
  stats: null,
  ...overrides,
});

const defaultProps = createMockProps();

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const setupMocks = (overrides = {}) => {
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
};

const renderComponent = (props = defaultProps) => {
  return render(
    <TestProviders>
      <SettingsFlyout {...props} />
    </TestProviders>
  );
};

const clickButton = (testId: string) => {
  const button = screen.getByTestId(testId);
  fireEvent.click(button);
};

const testSaveButtonInvocations = (props: typeof defaultProps) => {
  const assertions = [
    { fn: props.setEnd, name: 'setEnd' },
    { fn: props.setFilters, name: 'setFilters' },
    { fn: props.setQuery, name: 'setQuery' },
    { fn: props.setStart, name: 'setStart' },
    {
      fn: props.setLocalStorageAttackDiscoveryMaxAlerts,
      name: 'setLocalStorageAttackDiscoveryMaxAlerts',
    },
    { fn: props.onClose, name: 'onClose' },
  ];

  return assertions.map(({ fn, name }) => ({
    fn,
    name,
    test: () => expect(fn).toHaveBeenCalled(),
  }));
};

const testResetButtonWithDefaults = (props: typeof defaultProps) => {
  const defaultValues = [
    { fn: props.setEnd, name: 'setEnd', value: DEFAULT_END },
    { fn: props.setFilters, name: 'setFilters', value: [] },
    { fn: props.setQuery, name: 'setQuery', value: getDefaultQuery() },
    { fn: props.setStart, name: 'setStart', value: DEFAULT_START },
    {
      fn: props.setLocalStorageAttackDiscoveryMaxAlerts,
      name: 'setLocalStorageAttackDiscoveryMaxAlerts',
      value: `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`,
    },
    { fn: props.onClose, name: 'onClose', value: undefined },
  ];

  return defaultValues.map(({ fn, name, value }) => ({
    fn,
    name,
    value,
    test: () => {
      if (value === undefined) {
        expect(fn).toHaveBeenCalled();
      } else {
        expect(fn).toHaveBeenCalledWith(value);
      }
    },
  }));
};

describe('SettingsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders the flyout title', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: ATTACK_DISCOVERY_SETTINGS })).toBeInTheDocument();
  });

  it('invokes onClose when the close button is clicked', () => {
    renderComponent();

    clickButton('euiFlyoutCloseButton');

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  describe('when the save button is clicked', () => {
    beforeEach(() => {
      renderComponent();
      clickButton('save');
    });

    const saveButtonTests = testSaveButtonInvocations(defaultProps);

    saveButtonTests.forEach(({ name, test }) => {
      it(`invokes ${name}`, test);
    });
  });

  describe('when the save button is clicked after the reset button is clicked', () => {
    const localCustomProps = createMockProps({
      end: 'now-15m',
      filters: [mockFilter],
      localStorageAttackDiscoveryMaxAlerts: '123',
      query: { query: 'user.name : "user1" ', language: 'kuery' },
      start: 'now-45m',
    });

    beforeEach(() => {
      renderComponent(localCustomProps);
      clickButton('reset');
      clickButton('save');
    });

    const resetButtonTests = testResetButtonWithDefaults(localCustomProps);

    resetButtonTests.forEach(({ name, test, value }) => {
      const testName =
        value === undefined
          ? `invokes ${name}`
          : `invokes ${name} with default \`${name
              .replace('set', '')
              .replace('LocalStorageAttackDiscoveryMax', 'max')}\` value`;
      it(testName, test);
    });
  });

  describe('tabs', () => {
    it('renders the settings tab when defaultSelectedTabId is settings', () => {
      renderComponent(createMockProps({ defaultSelectedTabId: SETTINGS_TAB_ID }));

      expect(screen.getByRole('heading', { name: ATTACK_DISCOVERY_SETTINGS })).toBeInTheDocument();
    });

    it('renders the schedule tab when defaultSelectedTabId is schedule', async () => {
      renderComponent(createMockProps({ defaultSelectedTabId: SCHEDULE_TAB_ID }));

      expect(screen.getByRole('heading', { name: ATTACK_DISCOVERY_SCHEDULE })).toBeInTheDocument();
    });
  });

  describe('when connectorId is undefined', () => {
    it('save button is disabled', () => {
      const propsWithUndefinedConnector = createMockProps({
        connectorId: undefined,
      });

      renderComponent(propsWithUndefinedConnector);

      const save = screen.getByTestId('save');
      expect(save).toBeDisabled();
    });
  });

  it('handles empty filters array', () => {
    const propsWithEmptyFilters = createMockProps({
      filters: [],
    });

    renderComponent(propsWithEmptyFilters);

    const save = screen.getByTestId('save');
    expect(save).toBeEnabled();
  });
});
