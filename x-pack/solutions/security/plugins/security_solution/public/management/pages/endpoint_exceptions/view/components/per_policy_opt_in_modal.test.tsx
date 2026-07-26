/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EndpointExceptionsPerPolicyOptInModalProps } from './per_policy_opt_in_modal';
import { EndpointExceptionsPerPolicyOptInModal } from './per_policy_opt_in_modal';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';

describe('EndpointExceptionsPerPolicyOptInModal', () => {
  let props: EndpointExceptionsPerPolicyOptInModalProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    props = {
      onDismiss: jest.fn(),
      onConfirm: jest.fn(),
      isLoading: false,
    };

    const mockedContext = createAppRootMockRenderer();
    render = () =>
      (renderResult = mockedContext.render(<EndpointExceptionsPerPolicyOptInModal {...props} />));
  });

  it('renders', () => {
    render();

    expect(
      renderResult.getByText('Update to policy-based endpoint exceptions')
    ).toBeInTheDocument();

    expect(props.onDismiss).not.toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render();

    const confirmButton = renderResult.getByTestId('confirmEndpointExceptionsPerPolicyOptInButton');
    confirmButton.click();

    expect(props.onConfirm).toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when cancel button is clicked', () => {
    render();

    const cancelButton = renderResult.getByTestId('cancelEndpointExceptionsPerPolicyOptInButton');
    cancelButton.click();

    expect(props.onDismiss).toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('disables buttons when isLoading is true', () => {
    props.isLoading = true;
    render();

    const confirmButton = renderResult.getByTestId('confirmEndpointExceptionsPerPolicyOptInButton');
    expect(confirmButton).toBeDisabled();

    const cancelButton = renderResult.getByTestId('cancelEndpointExceptionsPerPolicyOptInButton');
    expect(cancelButton).toBeDisabled();
  });
});
