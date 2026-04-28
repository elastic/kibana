/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render } from '@testing-library/react';
import React from 'react';
import { AISummarySection } from './ai_summary_section';
import { AI_SUMMARY_SECTION_TEST_ID } from './test_ids';
import { ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID } from '../../../../flyout/shared/alert_summary';
import { useEventDetails } from '../../../../flyout/document_details/shared/hooks/use_event_details';
import { TestProviders } from '../../../../common/mock';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';

jest.mock('../../../../flyout/document_details/shared/hooks/use_event_details', () => ({
  useEventDetails: jest.fn(),
}));

jest.mock('../../../../flyout/shared/alert_summary/hooks/use_anonymization_toggle', () => ({
  useAnonymizationToggle: () => ({
    showAnonymizedValues: false,
    setShowAnonymizedValues: jest.fn(),
  }),
}));

jest.mock('../../../../common/hooks/use_ai_connectors', () => ({
  useAIConnectors: jest.fn().mockReturnValue({
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
    featureFlags: {
      getBooleanValue: jest.fn().mockReturnValue(false),
    },
  },
};

jest.mock('../../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../../common/lib/kibana'),
  useKibana: () => mockedUseKibana,
}));

const createMockHit = (): DataTableRecord =>
  ({
    id: 'event-id-1',
    raw: {
      _id: 'event-id-1',
      _index: 'alerts-index',
    },
    flattened: {},
    isAnchor: false,
  } as unknown as DataTableRecord);

describe('AISummarySection', () => {
  const mockUseEventDetails = jest.mocked(useEventDetails);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEventDetails.mockReturnValue({
      browserFields: {},
      dataAsNestedObject: null,
      dataFormattedForFieldBrowser: [],
      getFieldsData: jest.fn(),
      loading: false,
      refetchFlyoutData: jest.fn(),
      searchHit: undefined,
    });
  });

  it('renders the AI summary accordion with title, sparkles icon, and options menu', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <IntlProvider locale="en">
          <AISummarySection hit={createMockHit()} />
        </IntlProvider>
      </TestProviders>
    );

    await act(async () => {
      const section = getByTestId(AI_SUMMARY_SECTION_TEST_ID);
      expect(section).toHaveTextContent('AI summary');
      expect(section.querySelector('[data-euiicon-type="sparkles"]')).toBeInTheDocument();
      expect(getByTestId(ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID)).toBeInTheDocument();
    });
  });
});
