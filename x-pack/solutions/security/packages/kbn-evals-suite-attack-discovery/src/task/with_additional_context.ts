/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Appends additional context to the prompt the way product Attack Discovery does
 * (`invoke_graph_with_alerts`): `${prompt}\n\nAdditional context:\n${context}`.
 */
export const withAdditionalContext = (prompt: string, additionalContext?: string): string =>
  additionalContext != null && additionalContext.length > 0
    ? `${prompt}\n\nAdditional context:\n${additionalContext}`
    : prompt;
