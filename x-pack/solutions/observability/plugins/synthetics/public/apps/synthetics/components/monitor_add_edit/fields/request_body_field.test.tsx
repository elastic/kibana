/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';

import React, { useState, useCallback } from 'react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import { RequestBodyField } from './request_body_field';
import { CodeEditorMode } from '../types';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<RequestBodyField />', () => {
  let user: UserEvent;
  const defaultMode = CodeEditorMode.PLAINTEXT;
  const defaultValue = 'sample value';
  const WrappedComponent = ({ readOnly }: { readOnly?: boolean }) => {
    const [config, setConfig] = useState({
      type: defaultMode,
      value: defaultValue,
    });

    return (
      <RequestBodyField
        value={{
          value: config.value,
          type: config.type,
        }}
        onChange={useCallback(
          (code: any) => setConfig({ type: code.type as CodeEditorMode, value: code.value }),
          [setConfig]
        )}
        readOnly={readOnly}
      />
    );
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    // Note: We cannot use `pointerEventsCheck: 0` here because the code editor
    // relies on pointer events to determine if it should be read-only or not.
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  it('renders RequestBodyField', () => {
    const { getByText, getByLabelText } = render(<WrappedComponent />);

    expect(getByText('Form')).toBeInTheDocument();
    expect(getByText('Text')).toBeInTheDocument();
    expect(getByText('XML')).toBeInTheDocument();
    expect(getByText('JSON')).toBeInTheDocument();
    expect(getByLabelText('Text code editor')).toBeInTheDocument();
  });

  it('handles changing code editor mode', async () => {
    const { getByText, getByLabelText, queryByText, queryByLabelText } = render(
      <WrappedComponent />
    );

    // currently text code editor is displayed
    expect(getByLabelText('Text code editor')).toBeInTheDocument();
    expect(queryByText('Key')).not.toBeInTheDocument();

    const formButton = getByText('Form').closest('button');
    if (formButton) {
      fireEvent.click(formButton);
    }
    await waitFor(() => {
      expect(getByText('Add form field')).toBeInTheDocument();
      expect(queryByLabelText('Text code editor')).not.toBeInTheDocument();
    });
  });

  it('handles updating input', async () => {
    const { getByText, getByRole, getAllByRole, getByLabelText } = render(<WrappedComponent />);

    expect(getByLabelText('Text code editor')).toBeInTheDocument();
    const textbox = getByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, 'text');
    expect(textbox).toHaveValue('text');

    const xmlButton = getByText('XML').closest('button');
    if (xmlButton) {
      fireEvent.click(xmlButton);
    }

    expect(xmlButton).toHaveAttribute('aria-selected', 'true');
    await user.type(textbox, 'xml');
    expect(textbox).toHaveValue('textxml');

    const jsonButton = getByText('JSON').closest('button');
    if (jsonButton) {
      fireEvent.click(jsonButton);
    }

    expect(jsonButton).toHaveAttribute('aria-selected', 'true');
    await user.type(textbox, 'json');
    expect(textbox).toHaveValue('textxmljson');

    const formButton = getByText('Form').closest('button');
    if (formButton) {
      fireEvent.click(formButton);
    }

    expect(formButton).toHaveAttribute('aria-selected', 'true');
    await user.click(getByText('Add form field'));
    expect(getByText('Key')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
    const keyValueTextBox = getAllByRole('textbox')[0];
    await user.type(keyValueTextBox, 'formfield');
    expect(keyValueTextBox).toHaveValue('formfield');
  });

  // TODO: This test needs revisiting, after the userEvent v14 update the test fails to use
  // userEvent on the form field in read-only mode. And we cannot use `pointerEventsCheck: 0`
  // because it would defeat the purpose of the test.
  it.skip('handles read only', async () => {
    const { getByText, getByRole, getByLabelText } = render(<WrappedComponent readOnly={true} />);

    expect(getByLabelText('Text code editor')).toBeInTheDocument();
    const textbox = getByRole('textbox');
    await user.type(textbox, 'text');
    expect(textbox).toHaveValue(defaultValue);

    const xmlButton = getByText('XML').closest('button');
    if (xmlButton) {
      fireEvent.click(xmlButton);
    }

    expect(xmlButton).toHaveAttribute('aria-selected', 'true');
    await user.type(textbox, 'xml');
    expect(textbox).toHaveValue(defaultValue);

    const jsonButton = getByText('JSON').closest('button');
    if (jsonButton) {
      fireEvent.click(jsonButton);
    }

    expect(jsonButton).toHaveAttribute('aria-selected', 'true');
    await user.type(textbox, 'json');
    expect(textbox).toHaveValue(defaultValue);

    const formButton = getByText('Form').closest('button');
    if (formButton) {
      fireEvent.click(formButton);
    }

    expect(formButton).toHaveAttribute('aria-selected', 'true');
    expect(getByRole('button', { name: 'Add form field' })).toBeDisabled();
  });
});
