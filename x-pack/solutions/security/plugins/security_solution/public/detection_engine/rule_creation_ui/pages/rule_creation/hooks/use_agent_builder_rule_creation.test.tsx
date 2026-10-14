/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { useAgentBuilderRuleCreation } from './use_agent_builder_rule_creation';
import { AiRuleCreationService } from '../../../../common/ai_rule_creation_store';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_RULE_ATTACHMENT_ID,
} from '../../../../../../common/constants';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { FormHook } from '../../../../../shared_imports';
import type {
  DefineStepRule,
  AboutStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from '../../../../common/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/hooks/use_app_toasts');

const mockFormatRule = jest.fn();
jest.mock('../helpers', () => ({
  formatRule: (...args: unknown[]) => mockFormatRule(...args),
}));

const mockGetStepsData = jest.fn();
jest.mock('../../../../common/helpers', () => ({
  getStepsData: (...args: unknown[]) => mockGetStepsData(...args),
}));

const SYNC_DEBOUNCE_MS = 500;

const makeForm = <T extends object>() =>
  ({ updateFieldValues: jest.fn() } as unknown as FormHook<T, T>);

/** Conversation attachment as delivered by activeConversation$ (versioned shape). */
const makeRuleAttachment = ({ id = 'card-1', origin }: { id?: string; origin?: string } = {}) => ({
  id,
  type: SecurityAgentBuilderAttachments.rule,
  ...(origin ? { origin } : {}),
  current_version: 1,
  versions: [{ version: 1, data: { text: '{"name":"Chat Rule"}' } }],
});

describe('useAgentBuilderRuleCreation', () => {
  let aiRuleCreation: AiRuleCreationService;
  let activeConversation$: Subject<{ conversation?: { attachments: unknown[] } } | null>;
  let addAttachment: jest.Mock;
  let reportEvent: jest.Mock;
  let addSuccess: jest.Mock;
  let addWarning: jest.Mock;
  let forms: {
    defineStepForm: FormHook<DefineStepRule, DefineStepRule>;
    aboutStepForm: FormHook<AboutStepRule, AboutStepRule>;
    scheduleStepForm: FormHook<ScheduleStepRule, ScheduleStepRule>;
    actionsStepForm: FormHook<ActionsStepRule, ActionsStepRule>;
  };

  const renderTestHook = (props: { pageRuleId?: string; defineStepData?: DefineStepRule } = {}) =>
    renderHook(
      ({ defineStepData }: { defineStepData: DefineStepRule }) =>
        useAgentBuilderRuleCreation({
          ...forms,
          defineStepData,
          aboutStepData: {} as AboutStepRule,
          scheduleStepData: {} as ScheduleStepRule,
          actionsStepData: {} as ActionsStepRule,
          actionTypeRegistry: {} as ActionTypeRegistryContract,
          pageRuleId: props.pageRuleId,
        }),
      { initialProps: { defineStepData: props.defineStepData ?? ({} as DefineStepRule) } }
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    aiRuleCreation = new AiRuleCreationService();
    activeConversation$ = new Subject();
    addAttachment = jest.fn();
    reportEvent = jest.fn();
    addSuccess = jest.fn();
    addWarning = jest.fn();
    forms = {
      defineStepForm: makeForm<DefineStepRule>(),
      aboutStepForm: makeForm<AboutStepRule>(),
      scheduleStepForm: makeForm<ScheduleStepRule>(),
      actionsStepForm: makeForm<ActionsStepRule>(),
    };
    mockFormatRule.mockReturnValue({ name: '' });
    mockGetStepsData.mockReturnValue({
      defineRuleData: { d: 1 },
      aboutRuleData: { a: 1 },
      scheduleRuleData: { s: 1 },
      ruleActionsData: { r: 1 },
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        aiRuleCreation,
        telemetry: { reportEvent },
        agentBuilder: { addAttachment, events: { ui: { activeConversation$ } } },
      },
    });
    (useAppToasts as jest.Mock).mockReturnValue({ addSuccess, addWarning });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('form → chat sync', () => {
    it('does not push while sync is inactive', () => {
      renderTestHook();

      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));

      expect(addAttachment).not.toHaveBeenCalled();
    });

    it('pushes the formatted rule after the debounce once sync is active, labelled "New Rule" for an unnamed create', () => {
      renderTestHook();

      act(() => aiRuleCreation.activateFormSync());
      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));

      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SECURITY_RULE_ATTACHMENT_ID,
          type: SecurityAgentBuilderAttachments.rule,
          data: expect.objectContaining({ attachmentLabel: 'New Rule' }),
        })
      );
      // create intent → no saved-rule link
      expect(addAttachment.mock.calls[0][0].origin).toBeUndefined();
    });

    it('targets the bound attachment and includes origin after binding to an update-intent card', () => {
      renderTestHook({ pageRuleId: 'rule-1' });

      // Conversation shows this rule's card (origin matches the edit page's rule id).
      act(() => {
        activeConversation$.next({
          conversation: { attachments: [makeRuleAttachment({ id: 'card-9', origin: 'rule-1' })] },
        });
      });
      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));

      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'card-9',
          origin: 'rule-1',
          data: expect.objectContaining({ attachmentLabel: 'Rule' }),
        })
      );
    });

    it('warns once via toast when formatting fails, and re-arms after a successful sync', () => {
      const { rerender } = renderTestHook();
      mockFormatRule.mockImplementation(() => {
        throw new Error('boom');
      });

      act(() => aiRuleCreation.activateFormSync());
      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));
      rerender({ defineStepData: { queryBar: 1 } as unknown as DefineStepRule });
      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));

      // Two failing syncs → a single warning
      expect(addWarning).toHaveBeenCalledTimes(1);
      expect(addAttachment).not.toHaveBeenCalled();

      // A successful sync re-arms the warning
      mockFormatRule.mockReturnValue({ name: 'ok' });
      rerender({ defineStepData: { queryBar: 2 } as unknown as DefineStepRule });
      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));
      mockFormatRule.mockImplementation(() => {
        throw new Error('boom again');
      });
      rerender({ defineStepData: { queryBar: 3 } as unknown as DefineStepRule });
      act(() => jest.advanceTimersByTime(SYNC_DEBOUNCE_MS));

      expect(addWarning).toHaveBeenCalledTimes(2);
    });
  });

  describe('conversation changes', () => {
    it('deactivates sync and releases the bind when the conversation shows a different rule', () => {
      const deactivateFormSync = jest.spyOn(aiRuleCreation, 'deactivateFormSync');
      const releaseBind = jest.spyOn(aiRuleCreation, 'releaseBind');
      renderTestHook({ pageRuleId: 'rule-1' });

      act(() => {
        activeConversation$.next({
          conversation: { attachments: [makeRuleAttachment({ origin: 'other-rule' })] },
        });
      });

      expect(deactivateFormSync).toHaveBeenCalled();
      expect(releaseBind).toHaveBeenCalled();
    });

    it('binds and activates sync when the conversation shows this rule and nothing is bound yet', () => {
      let syncActive = false;
      aiRuleCreation.formSyncActive$.subscribe((active) => {
        syncActive = active;
      });
      renderTestHook({ pageRuleId: 'rule-1' });

      act(() => {
        activeConversation$.next({
          conversation: { attachments: [makeRuleAttachment({ id: 'card-7', origin: 'rule-1' })] },
        });
      });

      expect(aiRuleCreation.getBoundAttachmentId()).toBe('card-7');
      expect(syncActive).toBe(true);
    });
  });

  describe('chat → form apply', () => {
    const chatRule = { id: 'rule-1', name: 'Chat Rule', type: 'esql' } as RuleResponse;

    it('updates all four step forms, pushes the attachment, reports telemetry, and toasts', () => {
      renderTestHook();

      act(() => aiRuleCreation.setAiCreatedRule(chatRule));

      expect(forms.defineStepForm.updateFieldValues).toHaveBeenCalledWith({ d: 1 });
      expect(forms.aboutStepForm.updateFieldValues).toHaveBeenCalledWith({ a: 1 });
      expect(forms.scheduleStepForm.updateFieldValues).toHaveBeenCalledWith({ s: 1 });
      expect(forms.actionsStepForm.updateFieldValues).toHaveBeenCalledWith({ r: 1 });
      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attachmentLabel: 'Chat Rule' }) })
      );
      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(addSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('deactivates sync and releases the bind on unmount', () => {
      const deactivateFormSync = jest.spyOn(aiRuleCreation, 'deactivateFormSync');
      const releaseBind = jest.spyOn(aiRuleCreation, 'releaseBind');
      const { unmount } = renderTestHook();

      unmount();

      expect(deactivateFormSync).toHaveBeenCalled();
      expect(releaseBind).toHaveBeenCalled();
    });

    it('clears a lingering AI session when an edit page unmounts', () => {
      const { unmount } = renderTestHook({ pageRuleId: 'rule-1' });
      aiRuleCreation.startSession();

      unmount();

      expect(aiRuleCreation.getSession()).toBeNull();
    });
  });
});
