/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { FIXTURE_EVIDENCE } from '../__fixtures__/flyout_brief_document';
import { EXECUTIVE_BRIEF_SCOPE_ID } from '../constants';
import { ThreatOpenRequestProvider, useThreatOpenRequest } from './threat_open_request';
import { useBriefFlyoutActions } from './use_brief_flyout_actions';

const mockOpenChat = jest.fn();
const mockOpenEntity = jest.fn();
const mockUseOpenEntityFlyout = jest.fn();
let mockAgentBuilder: { openChat: jest.Mock } | undefined;

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { agentBuilder: mockAgentBuilder } }),
}));
jest.mock('../../entity_badge', () => ({
  useOpenEntityFlyout: (scopeId: string) => mockUseOpenEntityFlyout(scopeId),
}));

const Wrapper = ({ children }: React.PropsWithChildren) => (
  <ThreatOpenRequestProvider>{children}</ThreatOpenRequestProvider>
);

describe('useBriefFlyoutActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAgentBuilder = { openChat: mockOpenChat };
    mockUseOpenEntityFlyout.mockReturnValue({ open: mockOpenEntity, canOpen: () => true });
  });

  it('opens a new, unsent Agent Builder chat with the instruction and the evidence', () => {
    const { result } = renderHook(() => useBriefFlyoutActions(), { wrapper: Wrapper });

    result.current.triage?.({ instruction: 'Triage this', evidenceMarkdown: '## Evidence' });

    expect(mockOpenChat).toHaveBeenCalledWith({
      initialMessage: 'Triage this\n\n---\n\n## Evidence',
      autoSendInitialMessage: false,
      newConversation: true,
      sessionTag: 'security',
    });
  });

  it('has no triage action when Agent Builder is not available', () => {
    mockAgentBuilder = undefined;
    const { result } = renderHook(() => useBriefFlyoutActions(), { wrapper: Wrapper });

    expect(result.current.triage).toBeUndefined();
  });

  it('opens entities in the shared entity flyout under the brief scope', () => {
    const { result } = renderHook(() => useBriefFlyoutActions(), { wrapper: Wrapper });

    result.current.openEntity(FIXTURE_EVIDENCE.entities['ENT-1']);

    expect(mockUseOpenEntityFlyout).toHaveBeenCalledWith(EXECUTIVE_BRIEF_SCOPE_ID);
    expect(mockOpenEntity).toHaveBeenCalledWith({
      type: 'user',
      name: 'a.rodriguez',
      id: 'user:a.rodriguez@acme.example',
    });
  });

  it('scrolls to the threat card and requests its expansion, again on repeats', () => {
    const card = document.createElement('div');
    card.setAttribute('data-test-subj', 'executiveBriefThreatCard-2');
    card.scrollIntoView = jest.fn();
    document.body.appendChild(card);

    const { result } = renderHook(
      () => ({ actions: useBriefFlyoutActions(), request: useThreatOpenRequest() }),
      { wrapper: Wrapper }
    );
    expect(result.current.request).toBeUndefined();

    act(() => result.current.actions.openThreat(2));
    const first = result.current.request;
    act(() => result.current.actions.openThreat(2));

    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(first).toEqual({ rank: 2, nonce: 1 });
    expect(result.current.request).toEqual({ rank: 2, nonce: 2 });

    document.body.removeChild(card);
  });
});
