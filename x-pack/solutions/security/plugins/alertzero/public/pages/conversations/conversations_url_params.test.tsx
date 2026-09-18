/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { useConversationsUrlParams } from './conversations_url_params';

const renderUrlParams = (initialEntry = '/') => {
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [initialEntry] });
  const { result } = renderHook(() => useConversationsUrlParams(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    ),
  });

  return { result, history };
};

describe('useConversationsUrlParams', () => {
  it('reads the selected conversation and tab from the URL', () => {
    const { result } = renderUrlParams('/?selectedConversationId=inv-1&show=timeline');

    expect(result.current.selectedConversationId).toBe('inv-1');
    expect(result.current.show).toBe('timeline');
  });

  it('completes a bare conversation id with the default tab', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1');

    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=overview');
    expect(result.current.show).toBe('overview');
  });

  it('leaves an unrecognized tab alone and reports no tab', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1&show=nonsense');

    expect(result.current.show).toBeUndefined();
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=nonsense');
  });

  it('completes without adding a history entry, so Back cannot bounce back to the bare URL', () => {
    const { history } = renderUrlParams('/?selectedConversationId=inv-1');
    const lengthAfterCompleting = history.length;

    expect(lengthAfterCompleting).toBe(1);
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=overview');
  });

  it('leaves a URL with no conversation alone', () => {
    const { history } = renderUrlParams('/?surface=cfo%40corp');

    expect(history.location.search).toBe('?surface=cfo%40corp');
  });

  it('reports no selection when the param is absent', () => {
    const { result } = renderUrlParams('/');

    expect(result.current.selectedConversationId).toBeUndefined();
  });

  it('pushes when opening a conversation, so Back closes the flyout', () => {
    const { result, history } = renderUrlParams('/');
    const initialLength = history.length;

    act(() => result.current.selectConversation('inv-1'));

    expect(history.length).toBe(initialLength + 1);
  });

  it('names the default tab explicitly when a conversation is opened', () => {
    const { result, history } = renderUrlParams('/');

    act(() => result.current.selectConversation('inv-1'));

    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=overview');
  });

  it('resets the tab when a different conversation is opened', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1&show=timeline');

    act(() => result.current.selectConversation('inv-2'));

    expect(history.location.search).toBe('?selectedConversationId=inv-2&show=overview');
  });

  it('replaces when switching tabs, so tabs do not consume Back presses', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1');
    const initialLength = history.length;

    act(() => result.current.showTab('timeline'));

    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=timeline');
    expect(history.length).toBe(initialLength);
  });

  it('dismisses a missing conversation without leaving a history entry', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=missing&show=overview');
    const initialLength = history.length;

    act(() => result.current.dismissMissingConversation());

    expect(history.location.search).toBe('');
    // Back must not return to the bad id and re-run the not-found handling.
    expect(history.length).toBe(initialLength);
  });

  it('drops both params when the flyout closes', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1&show=timeline');

    act(() => result.current.clearSelectedConversation());

    expect(history.location.search).toBe('');
  });

  it('preserves unrelated params', () => {
    const { result, history } = renderUrlParams('/?surface=cfo%40corp');

    act(() => result.current.selectConversation('inv-1'));

    expect(new URLSearchParams(history.location.search).get('surface')).toBe('cfo@corp');
  });
});
