/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import type { AppContextTestRender } from '../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../common/mock/endpoint';
import { useLicense } from '../../common/hooks/use_license';
import { PLATINUM_ONLY_TOOLTIP, ResponseActionAddButton } from './response_action_add_button';
import { responseActionTypes } from './get_supported_response_actions';

jest.mock('../../common/hooks/use_license');

const useLicenseMock = useLicense as jest.Mock;

describe('ResponseActionAddButton', () => {
  let testContext: AppContextTestRender;

  const renderButton = () => {
    const FormContext = () => {
      const { form } = useForm({
        defaultValue: { responseActions: [] },
      });

      return (
        <Form form={form}>
          <ResponseActionAddButton
            supportedResponseActionTypes={responseActionTypes}
            addActionType={jest.fn()}
            updateActionTypeId={jest.fn()}
          />
        </Form>
      );
    };

    return testContext.render(<FormContext />);
  };

  beforeEach(() => {
    testContext = createAppRootMockRenderer();
    useLicenseMock.mockReturnValue({
      isPlatinumPlus: () => true,
    });
  });

  it('should enable the Elastic Defend option on Platinum+', () => {
    const { getByTestId } = renderButton();

    expect(getByTestId('Elastic Defend-response-action-type-selection-option')).toBeEnabled();
  });

  it('should disable the Elastic Defend option and show a Platinum tooltip below Platinum', async () => {
    useLicenseMock.mockReturnValue({
      isPlatinumPlus: () => false,
    });

    const { getByTestId, getByText } = renderButton();
    const option = getByTestId('Elastic Defend-response-action-type-selection-option');

    expect(option).toBeDisabled();

    await userEvent.hover(option.parentElement ?? option);
    await waitFor(() => {
      expect(getByText(PLATINUM_ONLY_TOOLTIP)).toBeInTheDocument();
    });
  });
});
