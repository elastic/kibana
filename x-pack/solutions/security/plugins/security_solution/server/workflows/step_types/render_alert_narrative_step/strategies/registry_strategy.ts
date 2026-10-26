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
  datasetIs,
  appendUserHostContext,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildRegistryNarrative = (source: AlertSource): string => {
  const eventAction = getSingleValue(source, 'event.action');
  const registryKey = getSingleValue(source, 'registry.key');
  const registryPath = getSingleValue(source, 'registry.path');
  const registryValue = getSingleValue(source, 'registry.value');
  const registryData = joinValues(getValues(source, 'registry.data.strings'));
  const processName = getSingleValue(source, 'process.name');

  let text = `Registry ${eventAction ?? 'event'}`;
  if (registryPath != null) {
    text += ` on ${registryPath}`;
  } else if (registryKey != null) {
    text += ` on ${registryKey}`;
  }
  if (registryValue != null) text += ` value ${registryValue}`;
  if (registryData != null) text += ` data ${registryData}`;
  if (processName != null) text += ` by process ${processName}`;

  text = appendUserHostContext(text, source);
  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const registryStrategy: NarrativeStrategy = {
  id: 'registry',
  priority: 40,
  match: (source) =>
    getSingleValue(source, 'registry.key') != null ||
    getSingleValue(source, 'registry.path') != null ||
    datasetIs(source, 'endpoint.events.registry'),
  build: buildRegistryNarrative,
};
