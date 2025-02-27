/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ScreenContext } from '@kbn/elastic-assistant-common';
import moment from 'moment-timezone';

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
const TIME_FORMAT = 'DD/MM/YYYY, HH:mm:ss [UTC]Z';

export const getFormattedTime = ({
  screenContextTimezone,
  uiSettingsDateFormatTimezone,
}: {
  screenContextTimezone: ScreenContext['timeZone'];
  uiSettingsDateFormatTimezone: string | undefined; //  From core.uiSettings.client.get('dateFormat:tz')
}) => {
  const currentTimezone: string =
    (uiSettingsDateFormatTimezone === 'Browser'
      ? screenContextTimezone
      : uiSettingsDateFormatTimezone) ?? 'UTC';

  const now = new Date();

  const currentFormatter = moment.tz(now, currentTimezone);
  const utcFormatter = moment.tz(now, 'UTC');

  // If the local timezone is different from UTC, we should show the UTC time as well
  const utcConversionRequired = currentFormatter.format('[UTC]Z') !== utcFormatter.format('[UTC]Z');

  const utcConversion = utcConversionRequired ? utcFormatter.format(TIME_FORMAT) : undefined;
  const currentTime = currentFormatter.format(TIME_FORMAT);

  return `Current time: ${currentTime} ${utcConversion ? `(${utcConversion})` : ''}`.trim();
};
