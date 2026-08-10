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

export const buildMachineLearningNarrative = (source: AlertSource): string => {
  const eventAction = getSingleValue(source, 'event.action');

  let text = 'Machine learning anomaly detected';
  if (eventAction != null) text += `: ${eventAction}`;

  text = appendUserHostContext(text, source);

  const sourceIp = getSingleValue(source, 'source.ip');
  const destinationIp = getSingleValue(source, 'destination.ip');
  if (sourceIp != null) text += ` source ${sourceIp}`;
  if (destinationIp != null) text += ` destination ${destinationIp}`;

  const message = getSingleValue(source, 'message');
  if (message != null) text += ` ${message}`;

  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const machineLearningStrategy: NarrativeStrategy = {
  id: 'machine_learning',
  priority: 90,
  match: (source) => ruleTypeIs(source, 'machine_learning'),
  build: buildMachineLearningNarrative,
};
