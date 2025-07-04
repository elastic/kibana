/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import { z } from '@kbn/zod';

import { selectTimelineById } from '../selectors';
import { updateColumnWidth } from '../actions';

const LocalStorageColumnSettingsSchema = z.record(
  z.string(),
  z.object({
    initialWidth: z.number().optional(),
    id: z.string(),
  })
);
export type LocalStorageColumnSettings = z.infer<typeof LocalStorageColumnSettingsSchema>;

export const TIMELINE_COLUMNS_CONFIG_KEY = 'timeline:columnsConfig';

type UpdateColumnWidthAction = ReturnType<typeof updateColumnWidth>;

function isUpdateColumnWidthAction(action: Action): action is UpdateColumnWidthAction {
  return action.type === updateColumnWidth.type;
}

/**
 * Saves the timeline column settings to localStorage when it changes
 */
export const timelineLocalStorageMiddleware: Middleware =
  ({ getState }) =>
  (next) =>
  (action: Action) => {
    // perform the action
    const ret = next(action);

    // Store the column config when it changes
    if (isUpdateColumnWidthAction(action)) {
      const timeline = selectTimelineById(getState(), action.payload.id);
      const timelineColumnsConfig = timeline.columns.reduce<LocalStorageColumnSettings>(
        (columnSettings, { initialWidth, id }) => {
          columnSettings[id] = { initialWidth, id };
          return columnSettings;
        },
        {}
      );
      setStoredTimelineColumnsConfig(timelineColumnsConfig);
    }

    return ret;
  };

export function getStoredTimelineColumnsConfig() {
  const storedConfigStr = localStorage.getItem(TIMELINE_COLUMNS_CONFIG_KEY);
  if (storedConfigStr) {
    try {
      return LocalStorageColumnSettingsSchema.parse(JSON.parse(storedConfigStr));
    } catch (_) {
      /* empty */
    }
  }
}

export function setStoredTimelineColumnsConfig(config?: LocalStorageColumnSettings) {
  localStorage.setItem(TIMELINE_COLUMNS_CONFIG_KEY, JSON.stringify(config));
}
