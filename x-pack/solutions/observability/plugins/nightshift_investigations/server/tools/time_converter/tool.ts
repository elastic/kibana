/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

export const TIME_CONVERTER_TOOL_ID = 'nightshift_time_converter_tool';

const MAX_TIME_INPUT_LENGTH = 200;

const UNIT_MS = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
} as const;

const RELATIVE =
  /^(?:in\s+(\d+)\s+(second|minute|hour|day|week)s?|(\d+)\s+(second|minute|hour|day|week)s?\s+ago)$/i;

/** Parses epoch seconds or milliseconds, `now`, `yesterday`, relative times, or any `Date`-parsable string. */
export const parseTimeInput = (input: string, now: Date = new Date()): Date | undefined => {
  const text = input.trim();
  if (/^\d{13}$/.test(text)) return new Date(Number(text));
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
  const lower = text.toLowerCase();
  if (lower === 'now') return now;
  if (lower === 'yesterday') return new Date(now.getTime() - UNIT_MS.day);
  if (lower === 'tomorrow') return new Date(now.getTime() + UNIT_MS.day);
  const relative = RELATIVE.exec(text);
  if (relative) {
    const [, futureCount, futureUnit, pastCount, pastUnit] = relative;
    const unit = (futureUnit ?? pastUnit).toLowerCase() as keyof typeof UNIT_MS;
    const sign = futureCount ? 1 : -1;
    return new Date(now.getTime() + sign * Number(futureCount ?? pastCount) * UNIT_MS[unit]);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const timeConverterSchema = lazySchema(() =>
  z.object({
    time_input: z.string().max(MAX_TIME_INPUT_LENGTH),
  })
);

export const createTimeConverterTool = (): BuiltinToolDefinition<typeof timeConverterSchema> => ({
  id: TIME_CONVERTER_TOOL_ID,
  type: ToolType.builtin,
  description: `Convert any provided time into epoch seconds, epoch milliseconds, and ISO 8601 format.

This tool can handle various time input formats including:
- ISO 8601 strings (e.g., "2023-12-25T10:30:00Z", "2023-12-25T10:30:00+05:00")
- RFC 2822 format (e.g., "Mon, 25 Dec 2023 10:30:00 +0000")
- Epoch seconds (e.g., "1703505000")
- Epoch milliseconds (e.g., "1703505000000")
- Human-readable dates (e.g., "2023-12-25 10:30:00", "Dec 25, 2023")
- Relative times (e.g., "now", "yesterday", "1 hour ago", "in 2 days")

Args:
    time_input: The time to convert. Can be in various formats as described above.

Returns:
    A formatted string with the converted time in multiple formats.`,
  tags: ['investigation'],
  schema: timeConverterSchema,
  annotations: {
    title: 'Time converter',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  excludeFromMcp: true,
  handler: async ({ time_input: timeInput }) => {
    const date = parseTimeInput(timeInput);
    if (!date) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Could not parse time input: ${timeInput}` },
          },
        ],
      };
    }
    const epochMs = date.getTime();
    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            text: `Epoch seconds: ${Math.floor(
              epochMs / 1000
            )}\nEpoch milliseconds: ${epochMs}\nISO 8601: ${date.toISOString()}`,
          },
        },
      ],
    };
  },
});
