/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { defer } from 'rxjs';
import type { Observable } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isToolProgressEvent, isToolResultEvent } from '@kbn/agent-builder-common';
import { getKibanaDefaultAgentCapabilities } from '@kbn/agent-builder-common/agents';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../../../../common/constants';
import { KibanaServices } from '../../../../../common/lib/kibana/services';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import * as i18n from '../translations';

const AGENT_BUILDER_CONVERSE_ASYNC_API_PATH = '/api/agent_builder/converse/async';
const SECURITY_CREATE_DETECTION_RULE_TOOL_ID = 'security.create_detection_rule';

export const useAgentBuilderStream = () => {
  const { addError } = useAppToasts();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const [updates, setUpdates] = useState<Array<{ message: string; timestamp: Date }>>([]);
  const [rule, setRule] = useState<RuleResponse | null>(null);

  const streamRuleCreation = useCallback(
    async ({ message, connectorId }: { message: string; connectorId: string }) => {
      setIsStreaming(true);
      setIsCancelled(false);
      setUpdates([{ message: 'Initializing rule creation process...', timestamp: new Date() }]);
      setRule(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const http = KibanaServices.get().http;
        const payload = {
          agent_id: THREAT_HUNTING_AGENT_ID,
          input: `Create detection rule based on the following query: ${message}`,
          connector_id: connectorId,
          capabilities: getKibanaDefaultAgentCapabilities(),
          attachments: [
            {
              type: SecurityAgentBuilderAttachments.rule,
              data: {
                text: '',
                attachmentLabel: 'AI Assisted Rule Creation',
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
              if (result?.type === 'other' && result.data?.success && result.data?.rule) {
                setRule(result.data.rule as RuleResponse);
              }
            }
          },
          error: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            addError(new Error(i18n.AI_ASSISTED_RULE_CREATION_ERROR_DURING_STREAM(errorMessage)), {
              title: i18n.AI_ASSISTED_RULE_CREATION_ERROR_TITLE,
            });
            setIsStreaming(false);
          },
          complete: () => {
            setIsStreaming(false);
            subscriptionRef.current = null;
          },
        });

        subscriptionRef.current = subscription;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addError(new Error(i18n.AI_ASSISTED_RULE_CREATION_ERROR_STARTING(errorMessage)), {
          title: i18n.AI_ASSISTED_RULE_CREATION_ERROR_TITLE,
        });
        setIsStreaming(false);
        subscriptionRef.current = null;
      }
    },
    [addError]
  );

  const cancelRuleCreation = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addError(new Error(i18n.AI_ASSISTED_RULE_CREATION_ERROR_ABORTING(errorMessage)), {
          title: i18n.AI_ASSISTED_RULE_CREATION_ERROR_TITLE,
        });
      }
    }

    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addError(new Error(i18n.AI_ASSISTED_RULE_CREATION_ERROR_UNSUBSCRIBING(errorMessage)), {
          title: i18n.AI_ASSISTED_RULE_CREATION_ERROR_TITLE,
        });
      }
      subscriptionRef.current = null;
    }

    setIsStreaming(false);
    setIsCancelled(true);
  }, [addError]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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
