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
  it('reads the selected conversation from the URL', () => {
    const { result } = renderUrlParams('/?selectedConversationId=inv-1');

    expect(result.current.selectedConversationId).toBe('inv-1');
  });

  it('reports no selection when the param is absent', () => {
    const { result } = renderUrlParams('/');

    expect(result.current.selectedConversationId).toBeUndefined();
  });

  it('leaves the URL untouched on read, so a shared link is not rewritten', () => {
    const { history } = renderUrlParams('/?selectedConversationId=inv-1&surface=cfo%40corp');

    expect(history.location.search).toBe('?selectedConversationId=inv-1&surface=cfo%40corp');
    expect(history.length).toBe(1);
  });

  it('pushes when opening a conversation, so Back closes the flyout', () => {
    const { result, history } = renderUrlParams('/');
    const initialLength = history.length;

    act(() => result.current.selectConversation('inv-1'));

    expect(history.location.search).toBe('?selectedConversationId=inv-1');
    expect(history.length).toBe(initialLength + 1);
  });

  it('replaces the id when a different conversation is opened', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1');

    act(() => result.current.selectConversation('inv-2'));

    expect(history.location.search).toBe('?selectedConversationId=inv-2');
  });

  it('drops the id when the flyout closes', () => {
    const { result, history } = renderUrlParams('/?selectedConversationId=inv-1');

    act(() => result.current.clearSelectedConversation());

    expect(history.location.search).toBe('');
  });

  it('preserves unrelated params', () => {
    const { result, history } = renderUrlParams('/?surface=cfo%40corp');

    act(() => result.current.selectConversation('inv-1'));

    expect(new URLSearchParams(history.location.search).get('surface')).toBe('cfo@corp');
  });

  it('carries no tab param: the flyout\u2019s tab state belongs to Agent Builder', () => {
    const { result, history } = renderUrlParams('/');

    act(() => result.current.selectConversation('inv-1'));

    expect(history.location.search).not.toContain('show');
    expect(result.current).not.toHaveProperty('show');
  });
});
