/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { useLoadConnectors } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';

import { EditForm } from './edit_form';

import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { getDefaultQuery } from '../../../helpers';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
  },
];

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../sourcerer/containers');
jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;
const onChangeMock = jest.fn();

const defaultProps = {
  initialValue: {
    name: '',
    alertsSelectionSettings: {
      query: getDefaultQuery(),
      filters: [],
      size: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
      start: DEFAULT_START,
      end: DEFAULT_END,
    },
    interval: '4h',
    actions: [],
  },
  onChange: onChangeMock,
};

const renderComponent = async () => {
  await act(() => {
    render(
      <TestProviders>
        <EditForm {...defaultProps} />
      </TestProviders>
    );
  });
};

const getBooleanValueMock = jest.fn();

describe('EditForm', () => {
  const mockTriggersActionsUi = triggersActionsUiMock.createStart();

  beforeEach(() => {
    jest.clearAllMocks();

    getBooleanValueMock.mockReturnValue(true);

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: getBooleanValueMock,
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: mockTriggersActionsUi,
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

    (useLoadConnectors as jest.Mock).mockReturnValue({
      isFetched: true,
      data: mockConnectors,
    });
  });

  it('should return the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
    });
  });

  it('should return the name input field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryFormNameField')).toBeInTheDocument();
    });
  });

  it('should return the connector selector field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toBeInTheDocument();
    });
  });

  it('should return the alert selection field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
    });
  });

  it('should return the alert selection component with `AlertSelectionQuery` as settings view', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
    });
  });

  it('should return the `run every` field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
    });
  });

  it('should return the actions field in the schedule editing form', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Select a connector type')).toBeInTheDocument();
    });
  });

  it('should invoke `onChange`', async () => {
    await renderComponent();

    expect(onChangeMock).toHaveBeenCalled();
  });

  it('should override default action frequency to `for each alert` instead of `summary of alerts`', async () => {
    mockTriggersActionsUi.getActionForm = jest.fn();

    await renderComponent();

    expect(mockTriggersActionsUi.getActionForm).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultRuleFrequency: {
          notifyWhen: 'onActiveAlert',
          summary: false,
          throttle: null,
        },
      })
    );
  });
});
