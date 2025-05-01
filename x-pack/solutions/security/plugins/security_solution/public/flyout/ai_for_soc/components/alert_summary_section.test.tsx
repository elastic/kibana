/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useAIForSOCDetailsContext } from '../context';
import { TestProviders } from '../../../common/mock';
import { ALERT_SUMMARY_SECTION_TEST_ID, AlertSummarySection } from './alert_summary_section';
import { ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID } from './settings_menu';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';

jest.mock('../context');

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
jest.mock('../../../common/lib/kibana', () => {
  return {
    ...jest.requireActual('../../../common/lib/kibana'),
    useKibana: () => mockedUseKibana,
  };
});

describe('AlertSummarySection', () => {
  it('should render the AI summary section', () => {
    (useAIForSOCDetailsContext as jest.Mock).mockReturnValue({
      eventId: 'eventId',
      dataFormattedForFieldBrowser: [],
      showAnonymizedValues: jest.fn(),
    });
    const getPromptContext = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <AlertSummarySection getPromptContext={getPromptContext} />
      </TestProviders>
    );

    expect(getByTestId(ALERT_SUMMARY_SECTION_TEST_ID)).toHaveTextContent('AI summary');
    expect(getByTestId(ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
