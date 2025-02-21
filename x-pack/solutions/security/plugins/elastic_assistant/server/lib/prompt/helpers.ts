/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ScreenContext } from "@kbn/elastic-assistant-common";

/**
 * use oss as model when using openai and oss
 * else default to given model
 * if no model exists, let undefined and resolveProviderAndModel logic will determine the model from connector
 * @param llmType
 * @param isOssModel
 * @param model
 */
export const getModelOrOss = (
  llmType?: string,
  isOssModel?: boolean,
  model?: string
): string | undefined => (llmType === 'openai' && isOssModel ? 'oss' : model);

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

export const getFormattedTime = ({
  screenContextTimezone,
  uiSettingsDateFormatTimezone,
} : {
  screenContextTimezone: ScreenContext['timeZone'];
  uiSettingsDateFormatTimezone: string | undefined; //  From core.uiSettings.client.get('dateFormat:tz')
}) => {

  const currentTimezone: string =
    (uiSettingsDateFormatTimezone === 'Browser'
      ? screenContextTimezone
      : uiSettingsDateFormatTimezone) ?? 'UTC';

  const currentFormatter = getTimeFormatter(currentTimezone);
  const utcFormatter = getTimeFormatter('UTC');

  // If the local timezone is different from UTC, we should show the UTC time as well
  const utcConversionRequired =
    getShortOffsetTimezone(currentFormatter) !== getShortOffsetTimezone(utcFormatter);

  const now = new Date();
  const utcConversion = utcConversionRequired ? utcFormatter.format(now) : undefined;
  const currentTime = currentFormatter.format(now);

  return `Current time: ${currentTime} ${utcConversion ? `(${utcConversion})` : ''}`.trim();
}