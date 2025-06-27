/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fallbackDataView = {
  id: '',
  title: '',
  toSpec: () => ({ id: '', title: '' }),
} as DataView;

export const fallbackDataViews = {
  defaultDataView: fallbackDataView,
  alertDataView: fallbackDataView,
} as unknown as DefaultDataViewsContextValue;
