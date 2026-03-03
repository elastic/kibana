/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NarrativeStrategy } from '../narrative_strategy';
import {
  getSingleValue,
  normalizeSpaces,
  categoryIs,
  datasetIs,
  appendUserHostContext,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildAuthenticationNarrative = (source: AlertSource): string => {
  const eventAction = getSingleValue(source, 'event.action');
  const outcome = getSingleValue(source, 'event.outcome');
  const sourceIp = getSingleValue(source, 'source.ip');
  const sourceOrg = getSingleValue(source, 'source.as.organization.name');
  const processName = getSingleValue(source, 'process.name');

  const action = (eventAction ?? '').toLowerCase();
  let text: string;

  if (action.includes('logon') || action.includes('log_on') || action.includes('login')) {
    text = `Authentication logon ${outcome ?? 'attempt'}`;
  } else if (
    action.includes('logoff') ||
    action.includes('log_off') ||
    action.includes('logout')
  ) {
    text = 'Authentication logoff';
  } else {
    text = `Authentication event${eventAction != null ? ` ${eventAction}` : ''}`;
    if (outcome != null) text += ` (${outcome})`;
  }

  text = appendUserHostContext(text, source);

  if (sourceIp != null) {
    text += ` from ${sourceIp}`;
    if (sourceOrg != null) text += ` (${sourceOrg})`;
  }
  if (processName != null) text += ` via ${processName}`;
  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const authenticationStrategy: NarrativeStrategy = {
  id: 'authentication',
  priority: 50,
  match: (source) =>
    categoryIs(source, 'authentication') || datasetIs(source, 'endpoint.events.security'),
  build: buildAuthenticationNarrative,
};
