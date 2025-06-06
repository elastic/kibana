/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';

import type { DefendInsightsGraphState } from '../../../../langchain/graphs';
import { ExampleDefendInsightsInputWithOverrides } from '../../example_input';

/**
 * Parses input from an LangSmith dataset example to get the graph input overrides
 */
export const getDefendInsightsGraphInputOverrides = (
  inputs: unknown
): Partial<DefendInsightsGraphState> => {
  const validatedInput = ExampleDefendInsightsInputWithOverrides.safeParse(inputs).data ?? {}; // safeParse removes unknown properties

  const { overrides } = validatedInput;

  // return all overrides at the root level:
  return {
    // pick extracts just the anonymizedDocuments and replacements from the root level of the input,
    // and only adds the anonymizedDocuments key if it exists in the input
    ...pick('anonymizedDocuments', validatedInput),
    ...pick('replacements', validatedInput),
    ...overrides, // bring all other overrides to the root level
  };
};
