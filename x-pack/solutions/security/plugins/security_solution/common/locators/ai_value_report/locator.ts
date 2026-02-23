/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { AI_VALUE_REPORT_LOCATOR } from '@kbn/deeplinks-analytics';
import { encode } from '@kbn/rison';
import { AI_VALUE_PATH, APP_UI_ID } from '../../constants';

const TimeRangeSchema = z.union([
  z.object({
    kind: z.literal('absolute'),
    from: z.string().nonempty(),
    to: z.string().nonempty(),
  }),
  z.object({
    kind: z.literal('relative'),
    fromStr: z.string().nonempty(),
    toStr: z.string().nonempty(),
  }),
]);

const AIValueReportParamsSchema = z.object({
  timeRange: TimeRangeSchema,
  // These are only required when rendering in export mode (e.g. for PDF generation).
  // When a user clicks "Open ..." from Reporting, we intentionally omit these to avoid
  // forcing the destination page into export mode UI.
  insight: z.string().nonempty().optional(),
  reportDataHash: z.string().nonempty().optional(),
});

export type AIValueReportParams = z.infer<typeof AIValueReportParamsSchema>;

export type ForwardedAIValueReportState = AIValueReportParams;

export type AIValueReportLocator = LocatorPublic<AIValueReportParams>;

export class AIValueReportLocatorDefinition implements LocatorDefinition<AIValueReportParams> {
  public readonly id = AI_VALUE_REPORT_LOCATOR;

  public readonly getLocation = async (params: AIValueReportParams) => {
    // The Security Solution app initializes its date pickers from the `timerange` URL param.
    // Encoding this into the URL ensures "Open ..." from Reporting preselects the time range.
    const timerangeParam = encode({
      valueReport: {
        timerange:
          params.timeRange.kind === 'absolute'
            ? {
                kind: 'absolute',
                from: params.timeRange.from,
                to: params.timeRange.to,
              }
            : {
                kind: 'relative',
                fromStr: params.timeRange.fromStr,
                toStr: params.timeRange.toStr,
              },
        linkTo: [],
      },
    });

    return {
      app: APP_UI_ID,
      path: `${AI_VALUE_PATH}?timerange=${timerangeParam}`,
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
