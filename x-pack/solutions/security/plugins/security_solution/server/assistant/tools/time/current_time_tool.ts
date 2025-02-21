/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { tool } from '@langchain/core/tools';
import type { CoreRequestHandlerContext } from '@kbn/core/server';
import { APP_UI_ID } from '../../../../common';

export interface CurrentTimeToolParams extends AssistantToolParams {
  core: CoreRequestHandlerContext;
}

export const CURRENT_TIME_TOOL_DETAILS = {
  id: 'current-time-tool',
  name: 'CurrentTimeTool',
  description:
    'Call this to get the current local time of the user, the local timezone, and the UTC equivelent. Useful for time-sensitive operations where the absoloute time is needed. Sometimes this tool may need to be called alongside other tool calls.',
} as const;

/** Formats time e.g. '14/02/2025, 09:33:12 UTC' */
const getTimeFormatter = (timezone: string | undefined) => {
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  } as Intl.DateTimeFormatOptions;

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  return formatter;
};

const getShortOffsetTimezone = (formatter: Intl.DateTimeFormat) => {
  const offset = formatter
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value;
  return offset;
};

export const CURRENT_TIME_TOOL: AssistantTool = {
  id: CURRENT_TIME_TOOL_DETAILS.id,
  name: CURRENT_TIME_TOOL_DETAILS.name,
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: CURRENT_TIME_TOOL_DETAILS.description,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is CurrentTimeToolParams => {
    const { core } = params;
    return core != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { core } = params as CurrentTimeToolParams;

    return tool(
      async () => {
        const settingsDateFormatTimezone = await core.uiSettings.client.get<string | undefined>(
          'dateFormat:tz'
        );
        const currentTimezone: string =
          (settingsDateFormatTimezone === 'Browser'
            ? params.screenContext?.timeZone
            : settingsDateFormatTimezone) ?? 'UTC';

        const currentFormatter = getTimeFormatter(currentTimezone);
        const utcFormatter = getTimeFormatter('UTC');

        // If the local timezone is different from UTC, we should show the UTC time as well
        const utcConversionRequired =
          getShortOffsetTimezone(currentFormatter) !== getShortOffsetTimezone(utcFormatter);

        const now = new Date();
        const utcConversion = utcConversionRequired ? utcFormatter.format(now) : undefined;
        const currentTime = currentFormatter.format(now);

        return `Current time: ${currentTime} ${utcConversion ? `(${utcConversion})` : ''}`.trim();
      },
      {
        name: CURRENT_TIME_TOOL_DETAILS.name,
        description: CURRENT_TIME_TOOL_DETAILS.description,
      }
    );
  },
};
