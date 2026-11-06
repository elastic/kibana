/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

import type { BaseGraphState, GraphInsightTypes } from '../../../../../../types';

export const getAnonymizedDocsFromState = (state: BaseGraphState<GraphInsightTypes>): string[] =>
  state.anonymizedDocuments.map((doc: Document) => doc.pageContent);
