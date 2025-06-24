/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core/types';

export function extractNotesCapabilities(capabilities: Capabilities) {
  const notesCrud = capabilities.securitySolutionNotes?.crud === true;
  const notesRead = capabilities.securitySolutionNotes?.read === true;
  return { read: notesRead, crud: notesCrud };
}
