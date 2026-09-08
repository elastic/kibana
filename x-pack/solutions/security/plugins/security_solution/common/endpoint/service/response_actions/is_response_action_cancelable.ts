/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepReadonly } from 'utility-types';
import { isActionSupportedByAgentType } from './is_response_action_supported';
import type { ResponseActionAgentType, ResponseActionsApiCommandNames } from './constants';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from './constants';

type CancelSupportMap = Record<
  ResponseActionsApiCommandNames,
  Record<ResponseActionAgentType, boolean>
>;

/** @private */
const CANCELABLE_RESPONSE_ACTIONS: DeepReadonly<CancelSupportMap> = {
  isolate: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  unisolate: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  'kill-process': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  'suspend-process': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  'running-processes': {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  'get-file': {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  execute: {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  upload: {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  scan: {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  cancel: {
    endpoint: false,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: false,
  },
  runscript: {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
  'memory-dump': {
    endpoint: true,
    sentinel_one: false,
    crowdstrike: false,
    microsoft_defender_endpoint: true,
  },
};

/**
 * Check if a response action for a given agent type supports being canceled
 */
export const isResponseActionCancelable = (
  command: ResponseActionsApiCommandNames,
  agentType: ResponseActionAgentType
): boolean => {
  return (
    (CANCELABLE_RESPONSE_ACTIONS[command]?.[agentType] ?? false) &&
    isActionSupportedByAgentType(agentType, command, 'manual') &&
    isActionSupportedByAgentType(agentType, 'cancel', 'manual')
  );
};

/**
 * Return list of Response Actions that can be canceled for a given agent type
 * @param agentType
 */
export const getListOfCancelableResponseActions = (
  agentType: ResponseActionAgentType
): ResponseActionsApiCommandNames[] => {
  return RESPONSE_ACTION_API_COMMANDS_NAMES.filter((command) =>
    isResponseActionCancelable(command, agentType)
  );
};
