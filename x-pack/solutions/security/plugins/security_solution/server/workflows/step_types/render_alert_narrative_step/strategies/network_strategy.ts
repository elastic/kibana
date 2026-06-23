/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NarrativeStrategy } from '../narrative_strategy';
import {
  getSingleValue,
  getNumberValue,
  normalizeSpaces,
  categoryIs,
  appendUserHostContext,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildNetworkNarrative = (source: AlertSource): string => {
  const eventAction = getSingleValue(source, 'event.action');
  const sourceIp = getSingleValue(source, 'source.ip');
  const sourcePort = getSingleValue(source, 'source.port');
  const destinationIp = getSingleValue(source, 'destination.ip');
  const destinationPort = getSingleValue(source, 'destination.port');
  const protocol = getSingleValue(source, 'network.protocol');
  const transport = getSingleValue(source, 'network.transport');
  const direction = getSingleValue(source, 'network.direction');
  const bytes = getNumberValue(source, 'network.bytes');
  const processName = getSingleValue(source, 'process.name');

  let text = 'Network';
  if (direction != null) text += ` ${direction}`;
  text += ` connection`;
  if (eventAction != null) text += ` (${eventAction})`;

  if (sourceIp != null) {
    text += ` from ${sourceIp}`;
    if (sourcePort != null) text += `:${sourcePort}`;
  }
  if (destinationIp != null) {
    text += ` to ${destinationIp}`;
    if (destinationPort != null) text += `:${destinationPort}`;
  }

  if (protocol != null || transport != null) {
    text += ` via ${[transport, protocol].filter(Boolean).join('/')}`;
  }

  if (bytes != null) text += ` (${bytes} bytes)`;
  if (processName != null) text += ` process ${processName}`;
  text = appendUserHostContext(text, source);
  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const networkStrategy: NarrativeStrategy = {
  id: 'network',
  priority: 20,
  match: (source) =>
    categoryIs(source, 'network') && getSingleValue(source, 'dns.question.name') == null,
  build: buildNetworkNarrative,
};
