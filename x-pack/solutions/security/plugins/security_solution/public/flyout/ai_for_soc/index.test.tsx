/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  AI_ASSISTANT_SECTION_TEST_ID,
  AIForSOCPanel,
  ALERT_SUMMARY_SECTION_TEST_ID,
  ATTACK_DISCOVERY_SECTION_TEST_ID,
  FLYOUT_BODY_TEST_ID,
  SUGGESTED_PROMPTS_SECTION_TEST_ID,
} from '.';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { rawEventData, TestProviders } from '../../common/mock';
import { AIForSOCDetailsContext } from './context';
import { useAlertsContext } from '../../detections/components/alerts_table/alerts_context';
import { mockDataFormattedForFieldBrowser } from '../document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { mockGetFieldsData } from '../document_details/shared/mocks/mock_get_fields_data';
import { useEventDetails } from '../document_details/shared/hooks/use_event_details';
import { type FlyoutPanelHistory, useExpandableFlyoutHistory } from '@kbn/expandable-flyout';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn().mockReturnValue({ closeLeftPanel: jest.fn() }),
  useExpandableFlyoutHistory: jest.fn(),
  useExpandableFlyoutState: jest.fn().mockReturnValue({ left: {} }),
}));
jest.mock('../document_details/shared/hooks/use_event_details');
jest.mock('../../detections/components/alerts_table/alerts_context', () => ({
  useAlertsContext: jest.fn(),
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
const mockContextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
  getFieldsData: jest.fn().mockImplementation(mockGetFieldsData),
  eventId: 'test-event-id',
  indexName: 'test-index',
  dataAsNestedObject: {
    _id: '123',
  },
} as unknown as AIForSOCDetailsContext;
describe('AIForSOCPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAlertsContext as jest.Mock).mockReturnValue({
      showAnonymizedValues: true,
    });
    (useEventDetails as jest.Mock).mockReturnValue({
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      dataAsNestedObject: {
        _id: '123',
      },
      getFieldsData: jest.fn(),
      loading: false,
      searchHit: rawEventData,
    });
    const flyoutHistory: FlyoutPanelHistory[] = [
      { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
    ];
    (useExpandableFlyoutHistory as jest.Mock).mockReturnValue(flyoutHistory);
  });

  it('renders the AIForSOCPanel component', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AIForSOCDetailsContext.Provider value={mockContextValue}>
          <AIForSOCPanel />
        </AIForSOCDetailsContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(FLYOUT_BODY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_SUMMARY_SECTION_TEST_ID)).toHaveTextContent('AI summary');
    expect(getByTestId(ATTACK_DISCOVERY_SECTION_TEST_ID)).toHaveTextContent('Attack Discovery');
    expect(getByTestId(AI_ASSISTANT_SECTION_TEST_ID)).toHaveTextContent('AI Assistant');
    expect(getByTestId(SUGGESTED_PROMPTS_SECTION_TEST_ID)).toHaveTextContent('Suggested prompts');
  });

  it('does not render the flyout body if dataFormattedForFieldBrowser is empty', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <AIForSOCDetailsContext.Provider
          value={{
            ...mockContextValue,
            eventId: 'test-event-id',
            getFieldsData: jest.fn(),
            indexName: 'test-index',
            dataFormattedForFieldBrowser: [],
          }}
        >
          <AIForSOCPanel />
        </AIForSOCDetailsContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(FLYOUT_BODY_TEST_ID)).toBeInTheDocument();
  });
});
