/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentSelection } from './use_run_document_workflow_panel';

/** Builds the `(id, index)` pairs to run on, dropping documents without an index, which the server rejects. */
export const toDocumentSelections = (
  documents: ReadonlyArray<{ _id: string; _index?: string | null }>
): DocumentSelection[] => documents.flatMap(({ _id, _index }) => (_index ? [{ _id, _index }] : []));
