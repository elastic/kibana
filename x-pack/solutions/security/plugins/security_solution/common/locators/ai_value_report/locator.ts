/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { z } from '@kbn/zod';
import { AI_VALUE_REPORT_LOCATOR, AI_VALUE_PATH, APP_UI_ID } from '../../constants';

const AIValueReportParamsSchema = z.object({
  timeRange: z.object({
    to: z.string().nonempty(),
    from: z.string().nonempty(),
  }),
  insight: z.string().nonempty(),
  reportDataHash: z.string().nonempty(),
});

export type AIValueReportParams = z.infer<typeof AIValueReportParamsSchema>;

export type ForwardedAIValueReportState = AIValueReportParams;

export type AIValueReportLocator = LocatorPublic<AIValueReportParams>;

export class AIValueReportLocatorDefinition implements LocatorDefinition<AIValueReportParams> {
  public readonly id = AI_VALUE_REPORT_LOCATOR;

  public readonly getLocation = async (params: AIValueReportParams) => {
    return {
      app: APP_UI_ID,
      path: AI_VALUE_PATH,
      state: params,
    };
  };
}

export const parseLocationState = (state: unknown): ForwardedAIValueReportState | undefined => {
  const result = AIValueReportParamsSchema.passthrough().safeParse(state);
  if (result.error) {
    // This will cause the page to fallback to rendering normally
    return undefined;
  }

  return result.data;
};
