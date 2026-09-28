/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SecurityPageName } from '../../../../app/types';
import { RuleCreationEventTypes } from '../../../../common/lib/telemetry/types';
import { useCreateRulePrimaryAction } from './use_create_rule_primary_action';

const mockOpenChat = jest.fn();
const mockReportEvent = jest.fn();
const mockStartSession = jest.fn(() => ({ sessionId: 'session-1' }));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      agentBuilder: { openChat: mockOpenChat },
      telemetry: { reportEvent: mockReportEvent },
      aiRuleCreation: { startSession: mockStartSession },
    },
  }),
}));

const mockGetSecuritySolutionUrl = jest.fn(
  ({ deepLinkId }: { deepLinkId: string }) => `/app/security/${deepLinkId}`
);
jest.mock('../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: () => mockGetSecuritySolutionUrl,
}));

const render = (props: Parameters<typeof useCreateRulePrimaryAction>[0]) =>
  renderHook(() => useCreateRulePrimaryAction(props)).result.current;

describe('useCreateRulePrimaryAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when AI rule creation is not available', () => {
    it('links to the rule creation page', () => {
      const action = render({
        isAiRuleCreationAvailable: false,
        isDisabled: false,
        isLoading: false,
      });

      expect(action).toMatchObject({
        href: `/app/security/${SecurityPageName.rulesCreate}`,
        testId: 'create-new-rule',
        disableButton: false,
      });
      expect(action.items).toBeUndefined();
    });

    it('is disabled when requested', () => {
      const action = render({
        isAiRuleCreationAvailable: false,
        isDisabled: true,
        isLoading: false,
      });

      expect(action.disableButton).toBe(true);
    });
  });

  describe('when AI rule creation is available', () => {
    const getAction = () =>
      render({ isAiRuleCreationAvailable: true, isDisabled: false, isLoading: true });

    it('renders a dropdown with AI and manual rule creation', () => {
      const action = getAction();

      expect(action).toMatchObject({ testId: 'create-rule-button', isLoading: true });
      expect(action.items?.map(({ testId }) => testId)).toEqual([
        'ai-rule-creation',
        'manual-rule-creation',
      ]);
    });

    it('links manual rule creation to the rule creation page', () => {
      const manualItem = getAction().items?.[1];

      expect(manualItem?.href).toBe(`/app/security/${SecurityPageName.rulesCreate}`);
    });

    it('starts an AI rule creation session in the agent chat', () => {
      const aiItem = getAction().items?.[0];

      aiItem?.run?.();

      expect(mockReportEvent).toHaveBeenCalledWith(RuleCreationEventTypes.CreationInitialized, {
        creationSource: 'ai',
        sessionId: 'session-1',
      });
      expect(mockOpenChat).toHaveBeenCalledWith(
        expect.objectContaining({ newConversation: true, sessionTag: 'security' })
      );
    });
  });
});
