/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import InferenceFlyoutWrapper from '@kbn/inference-endpoint-ui-common';
import { coreMock as mockCore } from '@kbn/core/public/mocks';
import { useKibana } from '../../hooks/use_kibana';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AddInferenceFlyoutWrapper } from './add_inference_flyout_wrapper';

jest.mock('../../hooks/use_kibana');
jest.mock('@kbn/inference-endpoint-ui-common');

const mockUseKibana = useKibana as jest.Mock;
const mockInferenceFlyoutWrapper = InferenceFlyoutWrapper as jest.Mock;

describe('AddInferenceFlyoutWrapper', () => {
  const mockServices = mockCore.createStart();
  const mockOnFlyoutClose = jest.fn();
  const mockReloadFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: mockServices,
    });

    mockInferenceFlyoutWrapper.mockImplementation(({ onSubmitSuccess }) => {
      return (
        <div data-testid="mock-inference-flyout">
          <button onClick={() => onSubmitSuccess()}>Trigger Success</button>
        </div>
      );
    });
  });

  it('renders InferenceFlyoutWrapper with correct props', () => {
    render(<AddInferenceFlyoutWrapper onFlyoutClose={mockOnFlyoutClose} reloadFn={mockReloadFn} />);

    expect(mockInferenceFlyoutWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        onFlyoutClose: mockOnFlyoutClose,
        http: mockServices.http,
        toasts: mockServices.notifications.toasts,
        onSubmitSuccess: expect.any(Function),
      }),
      expect.any(Object)
    );
  });

  it('calls reloadFn when onSubmitSuccess is triggered', () => {
    render(<AddInferenceFlyoutWrapper onFlyoutClose={mockOnFlyoutClose} reloadFn={mockReloadFn} />);

    screen.getByText('Trigger Success').click();
    expect(mockReloadFn).toHaveBeenCalled();
  });
});
