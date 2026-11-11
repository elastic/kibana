/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import type { UseAgentBuilderAttachmentParams } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../common/constants';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { useKibana } from '../../../../common/lib/kibana';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../common/types';
import { useAddRuleAttachmentToChatMenuItem } from './use_add_rule_attachment_to_chat_menu_item';

const mockOpenAgentBuilderFlyout = jest.fn();
const mockUseAgentBuilderAttachment = jest.fn();
const mockFormatRule = jest.fn();
const mockReportAddToChat = jest.fn();
const mockActivateFormSync = jest.fn();
const mockReleaseBind = jest.fn();

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('../../../../agent_builder/hooks/use_report_add_to_chat', () => ({
  useReportAddToChat: () => mockReportAddToChat,
}));
jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment', () => ({
  useAgentBuilderAttachment: (attachment: unknown) => {
    mockUseAgentBuilderAttachment(attachment);
    return { openAgentBuilderFlyout: mockOpenAgentBuilderFlyout };
  },
}));
jest.mock('../../pages/rule_creation/helpers', () => ({
  formatRule: (...args: unknown[]) => mockFormatRule(...args),
}));

const formParams = {
  defineStepData: {} as DefineStepRule,
  aboutStepData: {} as AboutStepRule,
  scheduleStepData: {} as ScheduleStepRule,
  actionsStepData: {} as ActionsStepRule,
  actionTypeRegistry: {} as ActionTypeRegistryContract,
};

const mockAvailability = (overrides: Partial<ReturnType<typeof useAgentBuilderAvailability>>) =>
  (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
    hasAgentBuilderPrivilege: true,
    isAgentChatExperienceEnabled: true,
    hasValidAgentBuilderLicense: true,
    ...overrides,
  });

const getLastAttachment = (): UseAgentBuilderAttachmentParams =>
  mockUseAgentBuilderAttachment.mock.calls.at(-1)[0];

describe('useAddRuleAttachmentToChatMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        aiRuleCreation: { activateFormSync: mockActivateFormSync, releaseBind: mockReleaseBind },
      },
    });
    mockAvailability({});
    mockFormatRule.mockReturnValue({ name: 'Formatted Rule' });
  });

  it('returns undefined without the Agent Builder privilege', () => {
    mockAvailability({ hasAgentBuilderPrivilege: false });

    const { result } = renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({ ...formParams, pathway: 'rule_creation' })
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the agent chat experience is disabled', () => {
    mockAvailability({ isAgentChatExperienceEnabled: false });

    const { result } = renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({ ...formParams, pathway: 'rule_creation' })
    );

    expect(result.current).toBeUndefined();
  });

  it('disables the item with an upgrade tooltip without a valid license', () => {
    mockAvailability({ hasValidAgentBuilderLicense: false });

    const { result } = renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({ ...formParams, pathway: 'rule_creation' })
    );

    expect(result.current).toEqual(
      expect.objectContaining({ disableButton: true, tooltipContent: expect.any(String) })
    );
  });

  it('attaches the formatted form state', () => {
    renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({ ...formParams, pathway: 'rule_creation' })
    );

    expect(getLastAttachment()).toEqual<UseAgentBuilderAttachmentParams>({
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify({ name: 'Formatted Rule' }),
        attachmentLabel: 'Formatted Rule',
      },
      attachmentDescription: 'Formatted Rule',
      attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
    });
  });

  it('falls back to the new rule label when the form has no name', () => {
    mockFormatRule.mockReturnValue({});

    renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({ ...formParams, pathway: 'rule_creation' })
    );

    expect(getLastAttachment().attachmentData?.attachmentLabel).toBe('New Rule');
  });

  it('links the attachment to an existing rule through origin only', () => {
    renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({
        ...formParams,
        existingRuleId: 'rule-123',
        pathway: 'rule_editing',
      })
    );

    const attachment = getLastAttachment();
    expect(attachment.origin).toBe('rule-123');
    expect(attachment.attachmentData?.text).not.toContain('rule-123');
  });

  it('reports telemetry, syncs the form and opens the flyout when run', () => {
    const { result } = renderHook(() =>
      useAddRuleAttachmentToChatMenuItem({ ...formParams, pathway: 'rule_editing' })
    );

    const item = result.current;
    if (!item || !('run' in item) || !item.run) {
      throw new Error('Expected a runnable menu item');
    }
    item.run();

    expect(mockReportAddToChat).toHaveBeenCalledWith({
      pathway: 'rule_editing',
      attachments: ['rule'],
    });
    expect(mockActivateFormSync).toHaveBeenCalledTimes(1);
    expect(mockReleaseBind).toHaveBeenCalledTimes(1);
    expect(mockOpenAgentBuilderFlyout).toHaveBeenCalledTimes(1);
  });
});
