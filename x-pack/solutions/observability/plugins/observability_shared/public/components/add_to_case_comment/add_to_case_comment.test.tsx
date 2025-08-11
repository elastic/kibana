/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCaseComment } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

// Mock i18n
jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

describe('AddToCaseComment', () => {
  const addErrorMock = jest.fn();
  const notificationsContractMock = notificationServiceMock.createStartContract();
  const notificationsMock = {
    ...notificationsContractMock,
    toasts: {
      ...notificationsContractMock.toasts,
      addError: addErrorMock,
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the input field with placeholder text', () => {
    render(
      <AddToCaseComment comment="" onCommentChange={jest.fn()} notifications={notificationsMock} />
    );

    expect(screen.getByPlaceholderText('Add a comment (optional)')).toBeInTheDocument();
  });

  it('updates the comment when text is entered', () => {
    const onCommentChangeMock = jest.fn();
    render(
      <AddToCaseComment
        comment=""
        onCommentChange={onCommentChangeMock}
        notifications={notificationsMock}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Add a comment (optional)'), {
      target: { value: 'New comment' },
    });

    expect(onCommentChangeMock).toHaveBeenCalledWith('New comment');
  });
});
