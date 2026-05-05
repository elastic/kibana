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
  datasetIs,
  appendUserHostContext,
  appendAlertSuffix,
} from '../narrative_utils';
import type { AlertSource } from '../narrative_utils';

export const buildFileNarrative = (source: AlertSource): string => {
  const eventAction = getSingleValue(source, 'event.action');
  const fileName = getSingleValue(source, 'file.name');
  const filePath = getSingleValue(source, 'file.path');
  const fileHash = getSingleValue(source, 'file.hash.sha256');
  const fileExtension = getSingleValue(source, 'file.extension');
  const fileSize = getNumberValue(source, 'file.size');

  let text = `File ${eventAction ?? 'event'}`;

  if (filePath != null) {
    text += ` ${filePath}`;
  } else if (fileName != null) {
    text += ` ${fileName}`;
  }

  if (fileExtension != null) text += ` (${fileExtension})`;
  if (fileSize != null) text += `, ${fileSize} bytes`;
  if (fileHash != null) text += ` sha256:${fileHash}`;

  text = appendUserHostContext(text, source);
  text = appendAlertSuffix(text, source);

  return normalizeSpaces(text);
};

export const fileStrategy: NarrativeStrategy = {
  id: 'file',
  priority: 10,
  match: (source) => {
    const hasFile =
      getSingleValue(source, 'file.path') != null || getSingleValue(source, 'file.name') != null;
    const hasProcess = getSingleValue(source, 'process.name') != null;
    return (
      hasFile &&
      !hasProcess &&
      (categoryIs(source, 'file') ||
        datasetIs(source, 'endpoint.events.file') ||
        datasetIs(source, 'file'))
    );
  },
  build: buildFileNarrative,
};
