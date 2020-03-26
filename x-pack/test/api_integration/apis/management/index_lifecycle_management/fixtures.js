/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString } from './lib';
import { INDEX_TEMPLATE_PATTERN_PREFIX } from './constants';

export const getPolicyPayload = ({ name = getRandomString() } = {}) => ({
  name,
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_size: '50gb',
        },
        set_priority: {
          priority: 100,
        },
      },
    },
    warm: {
      actions: {
        set_priority: {
          priority: 50,
        },
      },
    },
    cold: {
      min_age: '10d',
      actions: {
        set_priority: {
          priority: 0,
        },
      },
    },
    delete: {
      min_age: '10d',
      actions: {
        delete: {},
      },
    },
  },
});

export const getTemplatePayload = () => ({
  index_patterns: [`${INDEX_TEMPLATE_PATTERN_PREFIX}*`],
  settings: {
    number_of_shards: 1,
  },
});
