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
import { EasePanel, FLYOUT_BODY_TEST_ID } from '.';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { TestProviders } from '../../common/mock';
import { mockDataFormattedForFieldBrowser } from '../document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { type FlyoutPanelHistory, useExpandableFlyoutHistory } from '@kbn/expandable-flyout';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  FLYOUT_HISTORY_BUTTON_TEST_ID,
} from '../shared/components/test_ids';
import { useEaseDetailsContext } from './context';
import { TAKE_ACTION_BUTTON_TEST_ID } from './components/take_action_button';
import { mockDataAsNestedObject } from '../document_details/shared/mocks/mock_data_as_nested_object';
import { mockSearchHit } from '../document_details/shared/mocks/mock_search_hit';

vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: vi.fn().mockReturnValue({ closeLeftPanel: vi.fn() }),
    useExpandableFlyoutHistory: vi.fn(),
    useExpandableFlyoutState: vi.fn().mockReturnValue({ left: {} }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/hooks/use_ai_connectors', () => {
  const mocked = {
    useAIConnectors: vi.fn().mockReturnValue({
      aiConnectors: [
        {
          id: 'test-connector-id',
          name: 'Test Connector',
          actionTypeId: '.gen-ai',
        },
      ],
      isLoading: false,
      error: null,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./context');
vi.mock('./components/attack_discovery_widget', () => {
  const mocked = {
    AttackDiscoveryWidget: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    application: {
      ...mockUseKibana().services.application,
      capabilities: {
        management: {
          kibana: {
            settings: true,
          },
        },
      },
    },
    uiSettings: {
      get: vi.fn().mockReturnValue('default-connector-id'),
    },
  },
};
vi.mock('../../common/lib/kibana', async () => {
  return {
    ...(await vi.importActual('../../common/lib/kibana')),
    useKibana: () => mockedUseKibana,
  };
});

describe('EasePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const flyoutHistory: FlyoutPanelHistory[] = [
      { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
    ];
    (useExpandableFlyoutHistory as Mock).mockReturnValue(flyoutHistory);
  });

  it('renders the EasePanel component', () => {
    (useEaseDetailsContext as Mock).mockReturnValue({
      dataAsNestedObject: mockDataAsNestedObject,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: vi.fn(),
      investigationFields: [],
      searchHit: mockSearchHit,
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <EasePanel />
      </TestProviders>
    );

    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

    expect(getByTestId(FLYOUT_HISTORY_BUTTON_TEST_ID)).toBeInTheDocument();

    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('AI summary');
    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('Attack Discovery');
    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('AI Assistant');
    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toHaveTextContent('Suggested prompts');

    expect(getByTestId(TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
