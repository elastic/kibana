/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NarrativeStrategy } from '../narrative_strategy';
import {
  getSingleValue,
  getValues,
  joinValues,
  normalizeSpaces,
  appendUserHostContext,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildDnsNarrative = (source: AlertSource): string => {
  const questionName = getSingleValue(source, 'dns.question.name');
  const questionType = getSingleValue(source, 'dns.question.type');
  const resolvedIp = joinValues(getValues(source, 'dns.resolved_ip'));
  const responseCode = getSingleValue(source, 'dns.response_code');
  const processName = getSingleValue(source, 'process.name');

  let text = 'DNS query';
  if (questionName != null) text += ` for ${questionName}`;
  if (questionType != null) text += ` (${questionType})`;
  if (processName != null) text += ` from process ${processName}`;
  text = appendUserHostContext(text, source);
  if (resolvedIp != null) text += ` resolved to ${resolvedIp}`;
  if (responseCode != null) text += ` with response ${responseCode}`;
  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const dnsStrategy: NarrativeStrategy = {
  id: 'dns',
  priority: 70,
  match: (source) => getSingleValue(source, 'dns.question.name') != null,
  build: buildDnsNarrative,
};
