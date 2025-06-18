/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { EuiCopy } from '@elastic/eui';
import { BaseCommentActions } from './base_comment_actions';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(),
}));

describe('CommentActions', () => {
  beforeEach(() => {
    (EuiCopy as unknown as jest.Mock).mockClear();
  });

  it.each([
    [`Only this should be copied!{reference(exampleReferenceId)}`, 'Only this should be copied!'],
    [
      `Only this.{reference(exampleReferenceId)} should be copied!{reference(exampleReferenceId)}`,
      'Only this. should be copied!',
    ],
    [`{reference(exampleReferenceId)}`, ''],
  ])("textToCopy is correct when input is '%s'", async (input, expected) => {
    (EuiCopy as unknown as jest.Mock).mockReturnValue(null);
    const message: ClientMessage = {
      content: input,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    render(
      <BaseCommentActions message={message}>
        <></>
      </BaseCommentActions>
    );

    expect(EuiCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        textToCopy: expected,
      }),
      expect.anything()
    );
  });
});
