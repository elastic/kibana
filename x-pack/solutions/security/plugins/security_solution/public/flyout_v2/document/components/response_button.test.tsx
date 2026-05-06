/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import { RESPONSE_BUTTON_TEST_ID } from './test_ids';
import { ResponseButton } from './response_button';

const onShowResponseDetails = jest.fn();

const renderResponseButton = () =>
  render(
    <IntlProvider locale="en">
      <ResponseButton onShowResponseDetails={onShowResponseDetails} />
    </IntlProvider>
  );

describe('<ResponseButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render response button correctly', () => {
    const { getByTestId } = renderResponseButton();
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESPONSE_BUTTON_TEST_ID)).toHaveTextContent('Response');
  });

  it('should call onShowResponseDetails when clicked', () => {
    const { getByTestId } = renderResponseButton();

    fireEvent.click(getByTestId(RESPONSE_BUTTON_TEST_ID));

    expect(onShowResponseDetails).toHaveBeenCalledTimes(1);
  });
});
