/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { EuiFlexItem } from '@elastic/eui';
import { CommentActionsMounter } from './comment_actions_mounter';
import { CommentsService } from '@kbn/elastic-assistant-shared-state';
import ReactDOM from 'react-dom';

describe('CommentActionsMounter', () => {
  it('multiple comment actions are mounted', async () => {
    const message: ClientMessage = {
      content: 'This is a test comment',
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };

    const commentService = new CommentsService();

    const start = commentService.start();

    start.registerActions({
      order: 1,
      mount: (args) => (target: HTMLElement) => {
        const div = document.createElement('div');
        target.appendChild(div);
        ReactDOM.render(
          <EuiFlexItem data-test-subj="placeholder_actions_1">{'Hello'}</EuiFlexItem>,
          div
        );
        return () => {
          ReactDOM.unmountComponentAtNode(div);
          target.removeChild(div);
        };
      },
    });

    start.registerActions({
      order: 2,
      mount: (args) => (target: HTMLElement) => {
        const div = document.createElement('div');
        target.appendChild(div);
        ReactDOM.render(
          <EuiFlexItem data-test-subj="placeholder_actions_2">{'Bye'}</EuiFlexItem>,
          div
        );
        return () => {
          ReactDOM.unmountComponentAtNode(div);
          target.removeChild(div);
        };
      },
    });

    render(<CommentActionsMounter message={message} getActions$={start.getActions$()} />);

    expect(screen.getByTestId('copy-to-clipboard-action')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('placeholder_actions_1')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('placeholder_actions_2')).toBeInTheDocument());

    const placeholder1 = screen.getByTestId('placeholder_actions_1');
    const placeholder2 = screen.getByTestId('placeholder_actions_2');
    expect(
      // eslint-disable-next-line no-bitwise
      placeholder1.compareDocumentPosition(placeholder2) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('multiple comment actions are mounted in reverse order', async () => {
    const message: ClientMessage = {
      content: 'This is a test comment',
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };

    const commentService = new CommentsService();

    const start = commentService.start();

    start.registerActions({
      order: 2,
      mount: (args) => (target: HTMLElement) => {
        const div = document.createElement('div');
        target.appendChild(div);

        ReactDOM.render(
          <EuiFlexItem data-test-subj="placeholder_actions_1">{'Hello'}</EuiFlexItem>,
          div
        );
        return () => {
          ReactDOM.unmountComponentAtNode(div);
          target.removeChild(div);
        };
      },
    });

    start.registerActions({
      order: 1,
      mount: (args) => (target: HTMLElement) => {
        const div = document.createElement('div');
        target.appendChild(div);
        ReactDOM.render(
          <EuiFlexItem data-test-subj="placeholder_actions_2">{'Bye'}</EuiFlexItem>,
          div
        );
        return () => {
          ReactDOM.unmountComponentAtNode(div);
          target.removeChild(div);
        };
      },
    });

    render(<CommentActionsMounter message={message} getActions$={start.getActions$()} />);

    expect(screen.getByTestId('copy-to-clipboard-action')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('placeholder_actions_1')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('placeholder_actions_2')).toBeInTheDocument());

    const placeholder1 = screen.getByTestId('placeholder_actions_1');
    const placeholder2 = screen.getByTestId('placeholder_actions_2');
    expect(
      // eslint-disable-next-line no-bitwise
      placeholder1.compareDocumentPosition(placeholder2) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeFalsy();
  });
});
