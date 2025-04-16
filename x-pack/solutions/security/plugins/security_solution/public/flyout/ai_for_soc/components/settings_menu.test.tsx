/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID,
  ALERT_SUMMARY_OPTIONS_MENU_PANELS_TEST_ID,
  AlertSummaryOptionsMenu,
} from './settings_menu';
import { ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID } from './anonymization_switch';
import { useAlertsContext } from '../../../detections/components/alerts_table/alerts_context';

jest.mock('../../../detections/components/alerts_table/alerts_context', () => ({
  useAlertsContext: jest.fn(),
}));

describe('AlertSummaryOptionsMenu', () => {
  it('renders button with the anonymize option', () => {
    (useAlertsContext as jest.Mock).mockReturnValue({
      setShowAnonymizedValues: jest.fn(),
      showAnonymizedValues: false,
    });

    const { getByTestId } = render(<AlertSummaryOptionsMenu />);

    const button = getByTestId(ALERT_SUMMARY_OPTIONS_MENU_BUTTON_TEST_ID);

    expect(button).toBeInTheDocument();

    button.click();

    expect(getByTestId(ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_SUMMARY_OPTIONS_MENU_PANELS_TEST_ID)).toHaveTextContent('Options');
    expect(getByTestId(ALERT_SUMMARY_OPTIONS_MENU_PANELS_TEST_ID)).toHaveTextContent(
      'Show anonymized values'
    );
  });
});
