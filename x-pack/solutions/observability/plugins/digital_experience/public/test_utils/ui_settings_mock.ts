/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';

/** Kibana's default number and date formats, with a fixed time zone so tests don't depend on it. */
const UI_SETTINGS_DEFAULTS: Record<string, string> = {
  'format:number:defaultPattern': '0,0.[000]',
  'format:percent:defaultPattern': '0,0.[000]%',
  dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
  'dateFormat:tz': 'UTC',
};

/** A `uiSettings` client for tests, overridable per setting. */
export const createUiSettingsMock = (overrides: Record<string, string> = {}): IUiSettingsClient =>
  ({
    get: (key: string) => ({ ...UI_SETTINGS_DEFAULTS, ...overrides }[key]),
  } as unknown as IUiSettingsClient);
