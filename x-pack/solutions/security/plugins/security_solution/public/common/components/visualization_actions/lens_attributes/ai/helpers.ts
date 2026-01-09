/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAlertIndexFilter = (
  signalIndexName: string,
  indexPatternId: string = 'indexpattern-datasource-layer-unifiedHistogram'
) => ({
  meta: {
    disabled: false,
    negate: false,
    alias: null,
    index: indexPatternId,
    key: '_index',
    field: '_index',
    params: {
      query: signalIndexName,
    },
    type: 'phrase',
  },
  query: {
    match_phrase: {
      _index: signalIndexName,
    },
  },
  $state: {
    store: 'appState',
  },
});
