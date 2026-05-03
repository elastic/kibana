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
  ruleTypeIs,
  appendUserHostContext,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildThreatMatchNarrative = (source: AlertSource): string => {
  const matchedAtomic = getSingleValue(source, 'threat.indicator.matched.atomic');
  const matchedType = getSingleValue(source, 'threat.indicator.matched.type');
  const matchedField = getSingleValue(source, 'threat.indicator.matched.field');
  const indicatorProvider = getSingleValue(source, 'threat.indicator.provider');
  const feedName = getSingleValue(source, 'threat.feed.name');

  let text = 'Threat indicator match';

  if (matchedType != null) text += ` (${matchedType})`;
  if (matchedAtomic != null) text += `: ${matchedAtomic}`;
  if (matchedField != null) text += ` matched on field ${matchedField}`;
  if (indicatorProvider != null || feedName != null) {
    text += ` from ${feedName ?? indicatorProvider}`;
  }

  text = appendUserHostContext(text, source);
  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const threatMatchStrategy: NarrativeStrategy = {
  id: 'threat_match',
  priority: 100,
  match: (source) =>
    ruleTypeIs(source, 'threat_match') ||
    getSingleValue(source, 'threat.indicator.matched.atomic') != null,
  build: buildThreatMatchNarrative,
};
