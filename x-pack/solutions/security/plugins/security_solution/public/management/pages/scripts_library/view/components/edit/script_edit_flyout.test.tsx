/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { EndpointScriptEditFlyout, type EndpointScriptEditFlyoutProps } from './script_edit_flyout';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../../common/mock/endpoint';

describe('EndpointScriptEditFlyout', () => {
  let render: (props?: EndpointScriptEditFlyoutProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let defaultProps: EndpointScriptEditFlyoutProps;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    defaultProps = {
      error: null,
      isDisabled: false,
      isSubmittingData: false,
      show: 'edit',
      onChange: jest.fn(),
      onClose: jest.fn(),
      onSubmit: jest.fn(),
      'data-test-subj': 'test',
    };

    render = (props?: EndpointScriptEditFlyoutProps) => {
      renderResult = mockedContext.render(
        <EndpointScriptEditFlyout {...(props ?? defaultProps)} />
      );
      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render();

    const { getByTestId } = renderResult;
    expect(getByTestId('test-header')).toBeInTheDocument();
    expect(getByTestId('test-body')).toBeInTheDocument();
    expect(getByTestId('test-form')).toBeInTheDocument();
    expect(getByTestId('test-footer')).toBeInTheDocument();
  });

  it.each(['edit', 'create'])(
    'should call `onSubmit` with correct type, when save button is clicked in `%s` mode',
    async (show) => {
      const onSubmit = jest.fn();
      // @ts-ignore type checks for show
      render({ ...defaultProps, onSubmit, show });

      await userEvent.click(renderResult.getByTestId('test-footer-save-button'));
      expect(onSubmit).toHaveBeenCalledWith({ type: show });
    }
  );

  describe('Footer', () => {
    it('should show `cancel` button as enabled,  when `isDisabled` is true', () => {
      render({ ...defaultProps, isDisabled: true });

      expect(renderResult.getByTestId('test-footer-cancel-button')).toBeEnabled();
    });

    it('should disable `save` button, when `isDisabled` is true', () => {
      render({ ...defaultProps, isDisabled: true });

      expect(renderResult.getByTestId('test-footer-save-button')).toBeDisabled();
    });

    it('should disable `cancel` and `save` buttons when `isSubmittingData` is true', () => {
      render({ ...defaultProps, isSubmittingData: true });

      const { getByTestId } = renderResult;
      const saveButton = getByTestId('test-footer-save-button');
      const cancelButton = getByTestId('test-footer-cancel-button');

      expect(saveButton).toBeDisabled();
      expect(saveButton.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
      expect(cancelButton).toBeDisabled();
    });

    it('should call `onClose` when cancel button is clicked', async () => {
      const onClose = jest.fn();
      render({ ...defaultProps, onClose });

      await userEvent.click(renderResult.getByTestId('test-footer-cancel-button'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
