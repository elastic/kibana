/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AISummarySection } from './ai_summary_section';
import { AI_SUMMARY_TEST_ID } from './test_ids';
import { ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID } from '../../../shared/alert_summary';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';

jest.mock('../../../shared/alert_summary/hooks/use_anonymization_toggle', () => ({
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

const renderAISummarySection = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <AISummarySection />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<AISummarySection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the AI summary accordion with title, sparkles icon, and options menu', async () => {
    const { getByTestId } = renderAISummarySection();

    await act(async () => {
      const section = getByTestId(AI_SUMMARY_TEST_ID);
      expect(section).toHaveTextContent('AI summary');
      expect(section.querySelector('[data-euiicon-type="sparkles"]')).toBeInTheDocument();
      expect(getByTestId(ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID)).toBeInTheDocument();
    });
  });
});
