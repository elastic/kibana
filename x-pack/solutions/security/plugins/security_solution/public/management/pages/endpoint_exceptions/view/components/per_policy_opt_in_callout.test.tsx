/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EndpointExceptionsPerPolicyOptInCalloutProps } from './per_policy_opt_in_callout';
import { EndpointExceptionsPerPolicyOptInCallout } from './per_policy_opt_in_callout';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';

describe('EndpointExceptionsPerPolicyOptInCallout', () => {
  let props: EndpointExceptionsPerPolicyOptInCalloutProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    props = {
      onDismiss: jest.fn(),
      onClickUpdateDetails: jest.fn(),
    };

    const mockedContext = createAppRootMockRenderer();
    render = () =>
      (renderResult = mockedContext.render(<EndpointExceptionsPerPolicyOptInCallout {...props} />));
  });

  it('renders', () => {
    render();

    expect(renderResult.getByText('Endpoint Exceptions are now managed here')).toBeInTheDocument();

    expect(props.onDismiss).not.toHaveBeenCalled();
    expect(props.onClickUpdateDetails).not.toHaveBeenCalled();
  });

  it('calls onClickUpdateDetails when update details button is clicked', () => {
    render();

    const updateDetailsButton = renderResult.getByTestId(
      'updateDetailsEndpointExceptionsPerPolicyOptInButton'
    );
    updateDetailsButton.click();

    expect(props.onClickUpdateDetails).toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when cancel button is clicked', () => {
    render();

    const cancelButton = renderResult.getByTestId('euiDismissCalloutButton');
    cancelButton.click();

    expect(props.onDismiss).toHaveBeenCalled();
    expect(props.onClickUpdateDetails).not.toHaveBeenCalled();
  });
});
