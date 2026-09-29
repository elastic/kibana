/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { EuiCopy, EuiFlexItem } from '@elastic/eui';
import { BaseCommentActions } from './base_comment_actions';

vi.mock('@elastic/eui', async () => {
      const mocked = {
      ...(await vi.importActual('@elastic/eui')),
      EuiCopy: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('CommentActions', () => {
  beforeEach(() => {
    (EuiCopy as unknown as Mock).mockClear();
  });

  it.each([
    [`Only this should be copied!{reference(exampleReferenceId)}`, 'Only this should be copied!'],
    [
      `Only this.{reference(exampleReferenceId)} should be copied!{reference(exampleReferenceId)}`,
      'Only this. should be copied!',
    ],
    [`{reference(exampleReferenceId)}`, ''],
  ])("textToCopy is correct when input is '%s'", async (input, expected) => {
    (EuiCopy as unknown as Mock).mockReturnValue(null);
    const message: ClientMessage = {
      content: input,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    render(
      <BaseCommentActions message={message}>
        <EuiFlexItem grow={false} data-test-subj="placeholder_actions">
          <div>{'Other actions'}</div>
        </EuiFlexItem>
      </BaseCommentActions>
    );

    expect(EuiCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        textToCopy: expected,
      }),
      expect.anything()
    );

    expect(screen.getByTestId('copy-to-clipboard-action')).toBeInTheDocument();
    expect(screen.getByTestId('placeholder_actions')).toBeInTheDocument();
  });
});
