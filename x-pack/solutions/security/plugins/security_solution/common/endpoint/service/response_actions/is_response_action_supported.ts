/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ResponseActionAgentType,
  type ResponseActionsApiCommandNames,
  type ResponseActionType,
} from './constants';

type SupportMap = Record<
  ResponseActionsApiCommandNames,
  Record<ResponseActionType, Record<ResponseActionAgentType, boolean>>
>;

/** @internal */
const RESPONSE_ACTIONS_SUPPORT_MAP: SupportMap = {
  isolate: {
    automated: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: true,
      microsoft_defender_endpoint: true,
    },
  },
  unisolate: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: true,
      microsoft_defender_endpoint: true,
    },
  },
  upload: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  'get-file': {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  'kill-process': {
    automated: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  execute: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  'suspend-process': {
    automated: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  'running-processes': {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  scan: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
  runscript: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: true,
      crowdstrike: true,
      microsoft_defender_endpoint: true,
    },
  },
  cancel: {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: true,
    },
  },
  'memory-dump': {
    automated: {
      endpoint: false,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
    manual: {
      endpoint: true,
      sentinel_one: false,
      crowdstrike: false,
      microsoft_defender_endpoint: false,
    },
  },
};

/**
 * Check if a given Response action is supported (implemented) for a given agent type and action type
 * @param agentType
 * @param actionName
 * @param actionType
 */
export const isActionSupportedByAgentType = (
  agentType: ResponseActionAgentType,
  actionName: ResponseActionsApiCommandNames,
  actionType: ResponseActionType
): boolean => {
  return RESPONSE_ACTIONS_SUPPORT_MAP[actionName][actionType][agentType];
};
