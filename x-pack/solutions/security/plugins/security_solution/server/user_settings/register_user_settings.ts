/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { USER_SETTINGS_KEYS } from '../../common/user_settings/keys';

// Bounds keep each value in the KB range (profile-adjacent data, injected into page metadata when preloaded).
const MAX_TAB_ID_LENGTH = 128;
const MAX_SECTIONS = 100;
const MAX_SECTION_TITLE_LENGTH = 128;
const MAX_TABLES = 10;
// The alerts table serializes its own configuration (columns, visibleColumns, sort) to a JSON string.
// Storing it opaque keeps this key independent of the response-ops schema.
const MAX_TABLE_CONFIG_LENGTH = 16 * 1024;
const MAX_TABLE_ID_LENGTH = 256;

export const registerUserSettings = (userStorage: CoreSetup['userStorage']): void => {
  userStorage.register({
    [USER_SETTINGS_KEYS.FLYOUT_SELECTED_TAB]: {
      schema: z.string().max(MAX_TAB_ID_LENGTH),
      defaultValue: '',
      scope: 'global',
      // read synchronously when the flyout mounts: avoid a flash of the default tab
      preload: true,
    },
    [USER_SETTINGS_KEYS.FLYOUT_OVERVIEW_SECTIONS]: {
      schema: z
        .record(z.string().max(MAX_SECTION_TITLE_LENGTH), z.boolean())
        .refine((value) => Object.keys(value).length <= MAX_SECTIONS),
      defaultValue: {},
      scope: 'global',
      preload: true,
    },
    [USER_SETTINGS_KEYS.ALERTS_TABLE_COLUMNS]: {
      schema: z
        .record(z.string().max(MAX_TABLE_ID_LENGTH), z.string().max(MAX_TABLE_CONFIG_LENGTH))
        .refine((value) => Object.keys(value).length <= MAX_TABLES),
      defaultValue: {},
      scope: 'space',
      // preloaded: the table reads its configuration synchronously on first render. Worst case is
      // MAX_TABLES * MAX_TABLE_CONFIG_LENGTH (160 KB), typically a few KB.
      preload: true,
    },
  });
};
