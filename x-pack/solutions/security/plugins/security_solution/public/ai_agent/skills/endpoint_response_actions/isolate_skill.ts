/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { parseIntent } from './intent_parser';
import { resolveHost } from './host_resolver';
import { executeAction, pollActionStatus } from './action_client';
import { useExecuteAction } from './use_execute_action';
import type { ActionIntent, HostRef } from './types';

export interface UseIsolateSkillResult {
  parseMessage: (message: string) => ActionIntent | null;
  resolveHosts: (searchString: string) => Promise<HostRef[]>;
  execute: (actionType: string, agentId: string) => ReturnType<ReturnType<typeof useExecuteAction>['execute']>;
  result: ReturnType<typeof useExecuteAction>['result'];
  isExecuting: boolean;
  error: string | null;
}

/**
 * React hook that composes intent parsing, host resolution, and action execution
 * for isolate/unisolate response actions in the AI Agent chat.
 */
export const useIsolateSkill = (): UseIsolateSkillResult => {
  const { execute, result, isExecuting, error } = useExecuteAction(executeAction, pollActionStatus);

  const parseMessage = useCallback((message: string) => parseIntent(message), []);

  const resolveHosts = useCallback(async (searchString: string) => {
    return resolveHost({ searchString });
  }, []);

  return {
    parseMessage,
    resolveHosts,
    execute,
    result,
    isExecuting,
    error,
  };
};
