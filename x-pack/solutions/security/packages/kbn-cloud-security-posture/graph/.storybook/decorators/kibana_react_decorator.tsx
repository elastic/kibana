/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { action } from '@storybook/addon-actions';
import { createKibanaReactContext, type KibanaServices } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { of } from 'rxjs';
import {
  WEB_STORAGE_CLEAR_ACTION,
  WEB_STORAGE_GET_ITEM_ACTION,
  WEB_STORAGE_KEY_ACTION,
  WEB_STORAGE_REMOVE_ITEM_ACTION,
  WEB_STORAGE_SET_ITEM_ACTION,
  STORAGE_SET_ACTION,
  STORAGE_REMOVE_ACTION,
  STORAGE_CLEAR_ACTION,
  NOTIFICATIONS_SHOW_ACTION,
  NOTIFICATIONS_SUCCESS_ACTION,
  NOTIFICATIONS_WARNING_ACTION,
  NOTIFICATIONS_DANGER_ACTION,
  NOTIFICATIONS_ADD_ERROR_ACTION,
  NOTIFICATIONS_ADD_SUCCESS_ACTION,
  NOTIFICATIONS_ADD_WARNING_ACTION,
  NOTIFICATIONS_REMOVE_ACTION,
  EDIT_DATA_VIEW_ACTION,
} from '../constants';

const createMockWebStorage = () => ({
  clear: action(WEB_STORAGE_CLEAR_ACTION),
  getItem: action(WEB_STORAGE_GET_ITEM_ACTION),
  key: action(WEB_STORAGE_KEY_ACTION),
  removeItem: action(WEB_STORAGE_REMOVE_ITEM_ACTION),
  setItem: action(WEB_STORAGE_SET_ITEM_ACTION),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  set: action(STORAGE_SET_ACTION),
  remove: action(STORAGE_REMOVE_ACTION),
  clear: action(STORAGE_CLEAR_ACTION),
  get: () => true,
});

const uiSettings: Record<string, unknown> = {
  [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
    from: 'now-15m',
    to: 'now',
  },
  [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
    pause: true,
    value: 1000,
  },
  [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
    {
      from: 'now/d',
      to: 'now/d',
      display: 'Today',
    },
    {
      from: 'now/w',
      to: 'now/w',
      display: 'This week',
    },
    {
      from: 'now-15m',
      to: 'now',
      display: 'Last 15 minutes',
    },
    {
      from: 'now-30m',
      to: 'now',
      display: 'Last 30 minutes',
    },
    {
      from: 'now-1h',
      to: 'now',
      display: 'Last 1 hour',
    },
    {
      from: 'now-24h',
      to: 'now',
      display: 'Last 24 hours',
    },
    {
      from: 'now-7d',
      to: 'now',
      display: 'Last 7 days',
    },
    {
      from: 'now-30d',
      to: 'now',
      display: 'Last 30 days',
    },
    {
      from: 'now-90d',
      to: 'now',
      display: 'Last 90 days',
    },
    {
      from: 'now-1y',
      to: 'now',
      display: 'Last 1 year',
    },
  ],
};

const services: Partial<KibanaServices> = {
  application: applicationServiceMock.createStartContract(),
  uiSettings: {
    // @ts-ignore
    get: (key: string) => uiSettings[key],
    // @ts-ignore
    get$: (key: string) => of(services.uiSettings.get(key)),
  },
  // @ts-ignore
  settings: { client: { get: () => {} } },
  notifications: {
    toasts: {
      show: action(NOTIFICATIONS_SHOW_ACTION),
      success: action(NOTIFICATIONS_SUCCESS_ACTION),
      warning: action(NOTIFICATIONS_WARNING_ACTION),
      danger: action(NOTIFICATIONS_DANGER_ACTION),
      // @ts-ignore
      addError: action(NOTIFICATIONS_ADD_ERROR_ACTION),
      // @ts-ignore
      addSuccess: action(NOTIFICATIONS_ADD_SUCCESS_ACTION),
      // @ts-ignore
      addWarning: action(NOTIFICATIONS_ADD_WARNING_ACTION),
      remove: action(NOTIFICATIONS_REMOVE_ACTION),
    },
  },
  storage: createMockStorage(),
  data: {
    query: {
      savedQueries: {
        getSavedQueryCount: () => 0,
        findSavedQueries: () =>
          Promise.resolve({
            queries: [],
          }),
      },
    },
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve(false),
      getQuerySuggestions: () => [],
    },
    dataViews: {
      getIdsWithTitle: () => [],
    },
  },
  dataViewEditor: {
    userPermissions: {
      editDataView: action(EDIT_DATA_VIEW_ACTION),
    },
  },
};

export const KibanaReactStorybookDecorator = (Story: ComponentType) => {
  const KibanaReactContext = createKibanaReactContext(services);

  return (
    <KibanaReactContext.Provider>
      <Story />
    </KibanaReactContext.Provider>
  );
};
