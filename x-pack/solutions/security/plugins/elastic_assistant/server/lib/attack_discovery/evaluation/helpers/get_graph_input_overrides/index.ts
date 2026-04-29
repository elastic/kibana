/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryGraphState } from '../../../../langchain/graphs';
import { ExampleInputWithOverrides } from '../../example_input';

/**
 * Parses input from an LangSmith dataset example to get the graph input overrides
 */
export const getGraphInputOverrides = (outputs: unknown): Partial<AttackDiscoveryGraphState> => {
  const validatedInput = ExampleInputWithOverrides.safeParse(outputs).data ?? {}; // safeParse removes unknown properties

  const { replacements, overrides } = validatedInput;

  // Fallback to and rename the root level legacy properties `anonymizedAlerts`,
  // and `attackDiscoveries` to the new graph property names:
  const anonymizedDocuments = validatedInput.anonymizedDocuments ?? validatedInput.anonymizedAlerts;
  const insights = validatedInput.insights ?? validatedInput.attackDiscoveries;

  // return all overrides at the root level:
  return {
    anonymizedDocuments,
    insights,
    replacements,
    ...overrides, // bring all other overrides to the root level
  };
};
