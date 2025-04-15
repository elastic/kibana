/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { GraphState } from '../../../graphs/default_defend_insights_graph/types';
import { ExampleDefendInsightsInputWithOverrides } from '../../example_input';

/**
 * Parses input from an LangSmith dataset example to get the graph input overrides
 */
export const getDefendInsightsGraphInputOverrides = (inputs: unknown): Partial<GraphState> => {
  const validatedInput = ExampleDefendInsightsInputWithOverrides.safeParse(inputs).data ?? {}; // safeParse removes unknown properties

  const { overrides } = validatedInput;

  // return all overrides at the root level:
  return {
    // pick extracts just the anonymizedEvents and replacements from the root level of the input,
    // and only adds the anonymizedEvents key if it exists in the input
    ...pick('anonymizedEvents', validatedInput),
    ...pick('replacements', validatedInput),
    ...overrides, // bring all other overrides to the root level
  };
};
