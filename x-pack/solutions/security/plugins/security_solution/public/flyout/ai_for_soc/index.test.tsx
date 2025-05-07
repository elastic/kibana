/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AIForSOCPanel, FLYOUT_BODY_TEST_ID } from '.';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { TestProviders } from '../../common/mock';
import { mockDataFormattedForFieldBrowser } from '../document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { type FlyoutPanelHistory, useExpandableFlyoutHistory } from '@kbn/expandable-flyout';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  FLYOUT_HISTORY_BUTTON_TEST_ID,
} from '../shared/components/test_ids';
import { useAIForSOCDetailsContext } from './context';
import { TAKE_ACTION_BUTTON_TEST_ID } from './components/take_action_button';
import { mockDataAsNestedObject } from '../document_details/shared/mocks/mock_data_as_nested_object';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn().mockReturnValue({ closeLeftPanel: jest.fn() }),
  useExpandableFlyoutHistory: jest.fn(),
  useExpandableFlyoutState: jest.fn().mockReturnValue({ left: {} }),
}));

jest.mock('./context');
jest.mock('./components/attack_discovery_widget', () => ({
  AttackDiscoveryWidget: jest.fn(),
}));

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
      get: jest.fn().mockReturnValue('default-connector-id'),
    },
  },
};
jest.mock('../../common/lib/kibana', () => {
  return {
    ...jest.requireActual('../../common/lib/kibana'),
    useKibana: () => mockedUseKibana,
  };
});

describe('AIForSOCPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const flyoutHistory: FlyoutPanelHistory[] = [
      { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
    ];
    (useExpandableFlyoutHistory as jest.Mock).mockReturnValue(flyoutHistory);
  });

  it('renders the AIForSOCPanel component', () => {
    (useAIForSOCDetailsContext as jest.Mock).mockReturnValue({
      dataAsNestedObject: mockDataAsNestedObject,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      getFieldsData: jest.fn(),
      investigationFields: [],
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AIForSOCPanel />
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
