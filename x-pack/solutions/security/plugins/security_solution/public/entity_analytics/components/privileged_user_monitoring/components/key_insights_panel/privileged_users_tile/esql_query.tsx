/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

export const getPrivilegedUsersDslFilter = (dataViewId: string): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    index: dataViewId,
    key: 'user.is_privileged',
    negate: false,
    params: {
      query: true,
    },
    type: 'phrase',
  },
  query: {
    term: {
      'user.is_privileged': true,
    },
  },
});
