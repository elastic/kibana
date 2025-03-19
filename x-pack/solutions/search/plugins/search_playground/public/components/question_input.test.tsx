/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiForm } from '@elastic/eui';
import React, { FormEventHandler } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QuestionInput } from './question_input';

const mockButton = (
  <EuiButton data-test="btn" className="btn" onClick={() => {}}>
    Send
  </EuiButton>
);

const handleOnSubmitMock = jest.fn();

const MockChatForm = ({
  children,
  handleSubmit,
}: {
  children: React.ReactElement;
  handleSubmit: FormEventHandler;
}) => (
  <EuiForm
    component="form"
    css={{ display: 'flex', flexGrow: 1 }}
    onSubmit={handleSubmit}
    data-test-subj="chatPage"
  >
    {children}
  </EuiForm>
);
describe('Question Input', () => {
  describe('renders', () => {
    it('correctly', () => {
      render(
        <IntlProvider locale="en">
          <MockChatForm handleSubmit={handleOnSubmitMock}>
            <QuestionInput value="" onChange={() => {}} button={mockButton} isDisabled={false} />
          </MockChatForm>
        </IntlProvider>
      );

      expect(screen.getByTestId('questionInput')).toBeInTheDocument();
    });

    it('disabled', () => {
      render(
        <IntlProvider locale="en">
          <MockChatForm handleSubmit={handleOnSubmitMock}>
            <QuestionInput
              value="my question"
              onChange={() => {}}
              button={mockButton}
              isDisabled={true}
            />
          </MockChatForm>
        </IntlProvider>
      );

      expect(screen.getByTestId('questionInput')).toBeDisabled();
    });

    it('with value', () => {
      render(
        <IntlProvider locale="en">
          <MockChatForm handleSubmit={handleOnSubmitMock}>
            <QuestionInput
              value="my question"
              onChange={() => {}}
              button={mockButton}
              isDisabled={false}
            />
          </MockChatForm>
        </IntlProvider>
      );

      expect(screen.getByTestId('questionInput')).toHaveDisplayValue('my question');
    });
  });
  it('submits form', () => {
    render(
      <IntlProvider locale="en">
        <MockChatForm handleSubmit={handleOnSubmitMock}>
          <QuestionInput value="" onChange={() => {}} button={mockButton} isDisabled={false} />
        </MockChatForm>
      </IntlProvider>
    );

    const textArea = screen.getByTestId('questionInput');
    fireEvent.compositionStart(textArea);
    fireEvent.keyDown(textArea, {
      key: 'Enter',
      shiftKey: false,
    });
    expect(handleOnSubmitMock).not.toHaveBeenCalled();

    fireEvent.compositionEnd(textArea);
    fireEvent.keyDown(textArea, {
      key: 'Enter',
      shiftKey: false,
    });
    expect(handleOnSubmitMock).toHaveBeenCalled();
  });
});
