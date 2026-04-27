/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { ALERT_SUMMARY_SECTION_TEST_ID, AlertSummarySection } from './alert_summary_section';
import { ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID } from './alert_summary_options_menu';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';

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

jest.mock('../hooks/use_anonymization_toggle', () => ({
  useAnonymizationToggle: () => ({
    showAnonymizedValues: false,
    setShowAnonymizedValues: jest.fn(),
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
jest.mock('../../../../common/lib/kibana', () => {
  return {
    ...jest.requireActual('../../../../common/lib/kibana'),
    useKibana: () => mockedUseKibana,
  };
});

describe('AlertSummarySection', () => {
  it('should render the AI summary section', () => {
    const getPromptContext = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AlertSummarySection alertId="test-alert-id" getPromptContext={getPromptContext} />
      </TestProviders>
    );

    expect(getByTestId(ALERT_SUMMARY_SECTION_TEST_ID)).toHaveTextContent('AI summary');
    expect(getByTestId(ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render with custom data-test-subj', () => {
    const getPromptContext = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AlertSummarySection
          alertId="test-alert-id"
          getPromptContext={getPromptContext}
          data-test-subj="custom-test-id"
        />
      </TestProviders>
    );

    expect(getByTestId('custom-test-id')).toHaveTextContent('AI summary');
  });

  it('should use renderLayout when provided', () => {
    const getPromptContext = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AlertSummarySection
          alertId="test-alert-id"
          getPromptContext={getPromptContext}
          renderLayout={({ title, optionsMenu, body }) => (
            <div data-test-subj="custom-layout">
              <span data-test-subj="custom-layout-title">{title}</span>
              <span data-test-subj="custom-layout-menu">{optionsMenu}</span>
              <div data-test-subj="custom-layout-body">{body}</div>
            </div>
          )}
        />
      </TestProviders>
    );

    expect(getByTestId('custom-layout')).toBeInTheDocument();
    expect(getByTestId('custom-layout-title')).toHaveTextContent('AI summary');
  });
});
