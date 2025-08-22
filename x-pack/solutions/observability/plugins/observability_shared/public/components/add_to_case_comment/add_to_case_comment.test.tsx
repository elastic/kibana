/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCaseComment } from '.';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the comment when text is entered', () => {
    const onCommentChangeMock = jest.fn();
    render(<AddToCaseComment comment="" onCommentChange={onCommentChangeMock} />);

    fireEvent.change(screen.getByLabelText('Add a comment (optional)'), {
      target: { value: 'New comment' },
    });

    expect(onCommentChangeMock).toHaveBeenCalledWith('New comment');
  });
});
