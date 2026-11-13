/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  aesopSelectWinnerInputSchema,
  aesopSelectWinnerStepCommonDefinition,
} from '../../../../common/workflows/step_types/aesop_select_winner/aesop_select_winner_step_common';
import { selectWinner } from './select_winner';

export const aesopSelectWinnerStepDefinition = createServerStepDefinition({
  ...aesopSelectWinnerStepCommonDefinition,
  handler: async (context) => {
    const parsed = aesopSelectWinnerInputSchema.safeParse(context.input);
    if (!parsed.success) {
      return { error: new Error(`Invalid input: ${parsed.error.message}`) };
    }
    return { output: selectWinner(parsed.data) };
  },
});
