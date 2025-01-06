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
import { of } from 'rxjs';

const createMockWebStorage = () => ({
  clear: action('clear'),
  getItem: action('getItem'),
  key: action('key'),
  removeItem: action('removeItem'),
  setItem: action('setItem'),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  set: action('set'),
  remove: action('remove'),
  clear: action('clear'),
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
      show: action('notifications:show'),
      success: action('notifications:success'),
      warning: action('notifications:warning'),
      danger: action('notifications:danger'),
      // @ts-ignore
      addError: action('notifications:addError'),
      // @ts-ignore
      addSuccess: action('notifications:addSuccess'),
      // @ts-ignore
      addWarning: action('notifications:addWarning'),
      remove: action('notifications:remove'),
    },
  },
  storage: createMockStorage(),
  data: {
    query: {
      savedQueries: {
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
      editDataView: action('editDataView'),
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
