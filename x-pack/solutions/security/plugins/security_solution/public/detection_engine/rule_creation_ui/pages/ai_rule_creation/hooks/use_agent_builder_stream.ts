/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { defer } from 'rxjs';
import type { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isToolProgressEvent, isToolResultEvent } from '@kbn/agent-builder-common';
import { isErrorResult, isOtherResult } from '@kbn/agent-builder-common/tools';
import { getKibanaDefaultAgentCapabilities } from '@kbn/agent-builder-common/agents';
import { stringifyZodError } from '@kbn/zod-helpers';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import * as i18n from '../translations';
import type { ToolProgressUpdate } from '../agent_builder_updates';

const AGENT_BUILDER_CONVERSE_ASYNC_API_PATH = '/api/agent_builder/converse/async';
const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = 'security.create_detection_rule';

const parseRuleResponse = (ruleData: unknown) => {
  if (typeof ruleData !== 'object' || ruleData == null) {
    return RuleResponse.safeParse(ruleData);
  }

  const now = new Date().toISOString();
  // Values required by rule response schema
  // AI rule creation returns only fields that required for rule create API schema
  // but we need to return a complete rule response schema to satisfy UI form type requirements
  // these fields are technical fields that generated on server side and not be used in rule creation form on UI
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

  return RuleResponse.safeParse({ ...ruleData, ...placeholderFields });
};

export const useAgentBuilderStream = () => {
  const { services } = useKibana();
  const { http } = services;
  const { addError } = useAppToasts();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const [updates, setUpdates] = useState<Array<ToolProgressUpdate>>([]);
  const [rule, setRule] = useState<RuleResponse | null>(null);

  const showErrorToast = useCallback(
    (error: Error) => {
      addError(error, { title: i18n.AI_RULE_CREATION_ERROR_TITLE });
    },
    [addError]
  );

  const cancelRuleCreation = useCallback(() => {
    try {
      abortControllerRef.current?.abort?.();
    } catch (error) {
      showErrorToast(error);
    }

    try {
      subscriptionRef.current?.unsubscribe?.();
    } catch (error) {
      showErrorToast(error);
    } finally {
      subscriptionRef.current = null;
    }

    setIsStreaming(false);
    setIsCancelled(true);
  }, [showErrorToast]);

  const streamRuleCreation = useCallback(
    async ({ message, connectorId }: { message: string; connectorId: string }) => {
      setIsStreaming(true);
      setIsCancelled(false);
      setUpdates([{ message: 'Initializing rule creation process...', timestamp: new Date() }]);
      setRule(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const payload = {
          agent_id: THREAT_HUNTING_AGENT_ID,
          input: `Create a detection rule based on the following user_query using the dedicated detection rule creation tool. Do not perform any other actions after creating the rule. user_query: ${message}`,
          connector_id: connectorId,
          capabilities: getKibanaDefaultAgentCapabilities(),
          attachments: [
            {
              type: SecurityAgentBuilderAttachments.rule,
              data: {
                text: '',
                attachmentLabel: 'AI Rule Creation',
              },
            },
          ],
          browser_api_tools: [],
        };

        const events$: Observable<ChatEvent> = defer(() => {
          return http.post(AGENT_BUILDER_CONVERSE_ASYNC_API_PATH, {
            signal: abortController.signal,
            asResponse: true,
            rawResponse: true,
            body: JSON.stringify(payload),
          });
        }).pipe(
          // @ts-expect-error SseEvent mixin issue
          httpResponseIntoObservable<ChatEvent>()
        );

        // Subscribe to events - only track tool_progress for updates, extract rule from tool_result
        const subscription = events$.subscribe({
          next: (event) => {
            if (isToolProgressEvent(event)) {
              const eventMessage = event.data?.message || '';
              if (eventMessage) {
                setUpdates((prev) => [...prev, { message: eventMessage, timestamp: new Date() }]);
              }
            }

            // Extract rule from security.create_detection_rule tool_result events
            if (
              isToolResultEvent(event) &&
              event.data?.tool_id === SECURITY_CREATE_DETECTION_RULE_TOOL_ID
            ) {
              const result = event.data?.results?.[0];
              if (result && isErrorResult(result)) {
                cancelRuleCreation();
                showErrorToast(
                  new Error(result.data?.message ?? 'Unknown error during rule creation.')
                );
              } else if (
                result &&
                isOtherResult(result) &&
                result.data?.success &&
                result.data?.rule
              ) {
                const parseResult = parseRuleResponse(result.data.rule);
                if (parseResult.success) {
                  setRule(parseResult.data);
                } else {
                  showErrorToast(
                    new Error(`Invalid rule data received: ${stringifyZodError(parseResult.error)}`)
                  );
                }
              }
            }
          },
          error: (error) => {
            showErrorToast(error);
            cancelRuleCreation();
          },
          complete: () => {
            setIsStreaming(false);
          },
        });

        subscriptionRef.current = subscription;
      } catch (error) {
        showErrorToast(error);
        cancelRuleCreation();
      }
    },
    [showErrorToast, cancelRuleCreation, http]
  );

  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe?.();
      abortControllerRef.current?.abort?.();
    };
  }, []);

  return {
    streamRuleCreation,
    cancelRuleCreation,
    isStreaming,
    isCancelled,
    rule: isStreaming === false && isCancelled === false ? rule : null,
    updates,
  };
};
