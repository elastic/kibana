/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertReasonPanelContext } from './context';
import { mockContextValue } from './mocks/mock_context';
import { ALERT_REASON_BODY_TEST_ID } from './test_ids';
import { AlertReason } from './alert_reason';
import { TestProviders } from '../../../common/mock';

const panelContextValue = {
  ...mockContextValue,
};

const NO_DATA_MESSAGE = 'There was an error displaying data.';

describe('<AlertReason />', () => {
  it('should render alert reason preview', () => {
    const { getByTestId } = render(
      <AlertReasonPanelContext.Provider value={panelContextValue}>
        <AlertReason />
      </AlertReasonPanelContext.Provider>,
      { wrapper: TestProviders }
    );
    expect(getByTestId(ALERT_REASON_BODY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_REASON_BODY_TEST_ID)).toHaveTextContent('Alert reason');
  });

  it('should render no data message if alert reason is not available', () => {
    const { getByText } = render(
      <AlertReasonPanelContext.Provider value={{} as unknown as AlertReasonPanelContext}>
        <AlertReason />
      </AlertReasonPanelContext.Provider>,
      { wrapper: TestProviders }
    );
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
