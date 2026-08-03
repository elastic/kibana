/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

/** Same as agent_builder `storageKeys.agentId`. */
const AGENT_BUILDER_LAST_AGENT_ID_STORAGE_KEY = 'agentBuilder.agentId';

/**
 * Session flag: the next Security app effect teardown is from an in-app navigation that must not
 * clear Agent Builder session state (e.g. "Open entity in Security" from an attachment).
 */
const IN_APP_NAV_PRESERVE_AGENT_BUILDER_SESSION_KEY =
  'securitySolution.preserveAgentBuilderSessionDuringInAppNav';

export const readLastAgentBuilderAgentIdForSecuritySession = (): string => {
  if (typeof window === 'undefined' || window.localStorage == null) {
    return agentBuilderDefaultAgentId;
  }
  const stored = window.localStorage.getItem(AGENT_BUILDER_LAST_AGENT_ID_STORAGE_KEY);
  if (stored == null || stored === '') {
    return agentBuilderDefaultAgentId;
  }
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : stored;
  } catch {
    return stored;
  }
};

export const markPreserveAgentBuilderSessionDuringNextSecurityNavigation = (): void => {
  try {
    window.sessionStorage?.setItem(IN_APP_NAV_PRESERVE_AGENT_BUILDER_SESSION_KEY, '1');
  } catch {
    // private mode / quota
  }
};

/**
 * Returns true once if a preserve gate was set (and clears it). Idempotent per consume call.
 */
export const consumePreserveAgentBuilderSessionGate = (): boolean => {
  try {
    if (window.sessionStorage?.getItem(IN_APP_NAV_PRESERVE_AGENT_BUILDER_SESSION_KEY) === '1') {
      window.sessionStorage.removeItem(IN_APP_NAV_PRESERVE_AGENT_BUILDER_SESSION_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};
