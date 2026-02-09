/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser/events';
import {
  isToolProgressEvent,
  isToolResultEvent,
  isToolCallEvent,
  isReasoningEvent,
  isThinkingCompleteEvent,
} from '@kbn/agent-builder-common';
import { stringifyZodError } from '@kbn/zod-helpers';
import { v4 as uuidv4 } from 'uuid';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { getStepsData } from '../../../../common/helpers';
import type { FormHook } from '../../../../../shared_imports';
import type {
  DefineStepRule,
  AboutStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from '../../../../common/types';
import { RuleUpdateConfirmationToast } from '../components/rule_update_confirmation_toast';

const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = 'security.create_detection_rule';

const parseRuleResponse = (
  ruleData: unknown
): { success: boolean; data?: RuleResponse; error?: unknown } => {
  if (typeof ruleData !== 'object' || ruleData == null) {
    return { success: false, error: 'Invalid rule data' };
  }

  const now = new Date().toISOString();
  // Values required by rule response schema
  const placeholderFields = {
    version: 1,
    enabled: false,
    id: uuidv4(),
    rule_id: uuidv4(),
    immutable: false,
    rule_source: {
      type: 'internal',
    },
    updated_at: now,
    updated_by: 'AI Rule Creation',
    created_at: now,
    created_by: 'AI Rule Creation',
    revision: 0,
  };

  const parseResult = RuleResponse.safeParse({ ...ruleData, ...placeholderFields });
  if (parseResult.success) {
    return { success: true, data: parseResult.data };
  }
  return { success: false, error: parseResult.error };
};

export interface UseAgentBuilderRuleCreationResult {
  isThinking: boolean;
  shouldShowSkeleton: boolean;
  updateRuleFromAgentBuilder: (rule: RuleResponse) => void;
}

export const useAgentBuilderRuleCreation = (
  defineStepForm: FormHook<DefineStepRule, DefineStepRule>,
  aboutStepForm: FormHook<AboutStepRule, AboutStepRule>,
  scheduleStepForm: FormHook<ScheduleStepRule, ScheduleStepRule>,
  actionsStepForm: FormHook<ActionsStepRule, ActionsStepRule>
): UseAgentBuilderRuleCreationResult => {
  const { services } = useKibana();
  const { agentBuilder, i18n: i18nStart, theme } = services;
  const { addSuccess, addWarning, api: toasts } = useAppToasts();
  const location = useLocation();
  const [isThinking, setIsThinking] = useState(false);
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const pendingRuleRef = useRef<RuleResponse | null>(null);
  const isFirstRuleCreationRef = useRef(true);
  const formUpdatedRef = useRef(false);
  const detectionRuleToolCallIdRef = useRef<string | null>(null);

  // Check if page was opened from AI rule creation dropdown
  const isFromAiRuleCreation = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('fromAiRuleCreation') === 'true';
  }, [location.search]);

  const updateRuleFromAgentBuilder = useCallback(
    (rule: RuleResponse) => {
      const stepsData = getStepsData({ rule });

      // Update all form steps with the rule data
      defineStepForm.updateFieldValues(stepsData.defineRuleData);
      aboutStepForm.updateFieldValues(stepsData.aboutRuleData);
      scheduleStepForm.updateFieldValues(stepsData.scheduleRuleData);
      actionsStepForm.updateFieldValues(stepsData.ruleActionsData);

      addSuccess({
        title: 'Rule form updated',
        text: 'The rule form has been automatically updated with the AI-generated rule.',
      });
    },
    [defineStepForm, aboutStepForm, scheduleStepForm, actionsStepForm, addSuccess]
  );

  const handleToolResult = useCallback(
    (result: { type: string; data?: unknown }) => {
      if (result?.type === 'error') {
        addWarning({
          title: 'Rule creation failed',
          text:
            (result.data as { message?: string })?.message ?? 'Unknown error during rule creation.',
        });
        return;
      }

      if (result?.type !== 'other' || !result.data) {
        return;
      }

      const resultData = result.data as { success?: boolean; rule?: unknown };
      if (!resultData.success || !resultData.rule) {
        return;
      }

      const parseResult = parseRuleResponse(resultData.rule);
      if (!parseResult.success || !parseResult.data) {
        const errorMessage =
          parseResult.error &&
          typeof parseResult.error === 'object' &&
          'issues' in parseResult.error
            ? stringifyZodError(parseResult.error as Parameters<typeof stringifyZodError>[0])
            : String(parseResult.error);
        addWarning({
          title: 'Invalid rule data',
          text: `Failed to parse rule: ${errorMessage}`,
        });
        return;
      }

      const rule = parseResult.data;
      const isFirstCreation = isFirstRuleCreationRef.current;
      const formAlreadyUpdated = formUpdatedRef.current;

      if (isFirstCreation && !formAlreadyUpdated) {
        // First rule creation - automatically update form
        formUpdatedRef.current = true;
        isFirstRuleCreationRef.current = false;
        setShouldShowSkeleton(false);

        // Update form - use setTimeout to ensure it happens after state updates
        setTimeout(() => {
          try {
            updateRuleFromAgentBuilder(rule);
          } catch (error) {
            // Reset flags on error so user can try again
            formUpdatedRef.current = false;
            isFirstRuleCreationRef.current = true;
            setShouldShowSkeleton(true);
          }
        }, 0);
      } else {
        // Subsequent rule creations - ask for confirmation
        pendingRuleRef.current = rule;

        const toast = addSuccess({
          title: 'Rule created successfully',
          text: toMountPoint(
            <RuleUpdateConfirmationToast
              onUpdate={() => {
                if (pendingRuleRef.current) {
                  updateRuleFromAgentBuilder(pendingRuleRef.current);
                  pendingRuleRef.current = null;
                  formUpdatedRef.current = true;
                }
                toasts.remove(toast);
              }}
              onDismiss={() => {
                pendingRuleRef.current = null;
                toasts.remove(toast);
              }}
            />,
            { i18n: i18nStart, theme }
          ),
          toastLifeTimeMs: 15000,
          'data-test-subj': 'ai-rule-creation-success-toast',
        });
      }
    },
    [updateRuleFromAgentBuilder, addSuccess, addWarning, i18nStart, theme, toasts]
  );

  useEffect(() => {
    if (!agentBuilder?.events?.chat$) {
      return;
    }

    const subscription = agentBuilder.events.chat$.subscribe({
      next: (event: BrowserChatEvent) => {
        // Track when the detection rule creation tool is called
        if (isToolCallEvent(event)) {
          const toolId = event.data?.tool_id;
          if (toolId === SECURITY_CREATE_DETECTION_RULE_TOOL_ID) {
            detectionRuleToolCallIdRef.current = event.data?.tool_call_id ?? null;
          }
        }

        // Detect when the detection rule creation tool starts executing
        if (isToolProgressEvent(event)) {
          const toolCallId = event.data?.tool_call_id;
          // Only show skeleton if this is progress for the detection rule creation tool
          if (
            toolCallId === detectionRuleToolCallIdRef.current &&
            isFromAiRuleCreation &&
            isFirstRuleCreationRef.current &&
            !formUpdatedRef.current
          ) {
            setIsThinking(true);
            setShouldShowSkeleton(true);
          }
        }

        // Detect when agent starts thinking (reasoning event)
        if (isReasoningEvent(event)) {
          setIsThinking(true);
        }

        // Detect when thinking is complete
        if (isThinkingCompleteEvent(event)) {
          setIsThinking(false);
        }

        // Handle tool result from detection rule creation
        if (isToolResultEvent(event)) {
          const toolId = event.data?.tool_id;
          const results = event.data?.results;

          if (toolId === SECURITY_CREATE_DETECTION_RULE_TOOL_ID && results && results.length > 0) {
            setIsThinking(false);
            // Clear the tracked tool call ID after result
            detectionRuleToolCallIdRef.current = null;
            handleToolResult(results[0]);
          }
        }
      },
      error: (error) => {
        // eslint-disable-next-line no-console
        console.error('[useAgentBuilderRuleCreation] Error in event subscription:', error);
      },
    });

    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [agentBuilder, handleToolResult, isFromAiRuleCreation]);

  return {
    isThinking,
    shouldShowSkeleton,
    updateRuleFromAgentBuilder,
  };
};
