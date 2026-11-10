/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import identifierRule from './identifier_rule.text';

/** Appends the rule that keeps identifiers out of a judge's reasoning to its system prompt. */
export const withIdentifierRule = (systemPrompt: string): string =>
  `${systemPrompt}${identifierRule}`;
