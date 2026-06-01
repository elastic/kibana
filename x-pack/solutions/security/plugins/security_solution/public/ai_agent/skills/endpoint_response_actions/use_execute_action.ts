/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { Semaphore } from './semaphore';
import { MAX_CONCURRENT_ACTIONS, POLL_INTERVAL_MS, MAX_POLL_DURATION_MS } from './constants';

/** Result of an endpoint response action. */
export interface ActionResult {
  actionId: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  timestamp: string;
}

/** A function that executes a response action and returns an action ID. */
export type ExecuteActionFn = (
  actionType: string,
  agentId: string
) => Promise<{ actionId: string }>;

/** A function that polls for action status and returns the result. */
export type PollActionStatusFn = (actionId: string) => Promise<ActionResult>;

/**
 * React hook that manages endpoint response action execution with
 * a semaphore-based rate limiter (5 concurrent) and polling for status.
 *
 * @param executeAction - Executes the response action and returns action ID.
 * @param pollActionStatus - Polls action status and returns ActionResult.
 * @returns Object with execute, result, isExecuting, and error.
 */
export function useExecuteAction(
  executeAction: ExecuteActionFn,
  pollActionStatus?: PollActionStatusFn
) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const semaphoreRef = useRef<Semaphore | null>(null);

  // Lazily create the semaphore so it's stable across re-renders
  if (semaphoreRef.current === null) {
    semaphoreRef.current = new Semaphore(MAX_CONCURRENT_ACTIONS);
  }

  const execute = useCallback(
    async (actionType: string, agentId: string): Promise<ActionResult | null> => {
      setIsExecuting(true);
      setError(null);
      setResult(null);

      // Acquire a semaphore slot (blocks if 5 are already in flight)
      const semaphore = semaphoreRef.current;
      if (!semaphore) {
        throw new Error('Semaphore not initialized');
      }
      const release = await semaphore.acquire();

      try {
        // Execute the action
        const { actionId } = await executeAction(actionType, agentId);

        // Poll for status if a poller is provided
        let actionResult: ActionResult;
        if (pollActionStatus) {
          const start = Date.now();
          actionResult = {
            actionId,
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          setResult(actionResult);

          while (Date.now() - start < MAX_POLL_DURATION_MS) {
            actionResult = await pollActionStatus(actionId);
            setResult({ ...actionResult, timestamp: new Date().toISOString() });

            if (actionResult.status !== 'pending') {
              break;
            }
            // Wait before next poll
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }

          // If still pending after timeout, mark as failed
          if (actionResult.status === 'pending') {
            actionResult = {
              ...actionResult,
              status: 'failed',
              errorMessage: `Action ${actionId} timed out after ${MAX_POLL_DURATION_MS / 1000}s`,
            };
            setResult(actionResult);
          }
        } else {
          // No poller: just return the action ID as a pending result
          actionResult = {
            actionId,
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          setResult(actionResult);
        }

        return actionResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setResult({
          actionId: '',
          status: 'failed',
          errorMessage: message,
          timestamp: new Date().toISOString(),
        });
        return null;
      } finally {
        setIsExecuting(false);
        release();
      }
    },
    [executeAction, pollActionStatus]
  );

  return { execute, result, isExecuting, error };
}
