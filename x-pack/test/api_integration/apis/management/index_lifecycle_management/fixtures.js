/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_TEMPLATE_PATTERN_PREFIX } from './constants';

export const getPolicyPayload = (name) => ({
  name,
  phases: {
    hot: {
      min_age: '1d',
      actions: {
        set_priority: {
          priority: 100,
        },
        unfollow: {},
        rollover: {
          max_age: '30d',
          max_size: '50gb',
        },
      },
    },
    warm: {
      actions: {
        set_priority: {
          priority: 50,
        },
        unfollow: {},
        readonly: {},
        allocate: {
          number_of_replicas: 5,
          include: {
            a: 'a',
          },
          exclude: {
            b: 'b',
          },
          require: {
            c: 'c',
          },
        },
        shrink: {
          number_of_shards: 1,
        },
        forcemerge: {
          max_num_segments: 1,
        },
      },
    },
    cold: {
      min_age: '10d',
      actions: {
        set_priority: {
          priority: 0,
        },
        unfollow: {},
        allocate: {
          number_of_replicas: 5,
          include: {
            a: 'a',
          },
          exclude: {
            b: 'b',
          },
          require: {
            c: 'c',
          },
        },
        freeze: {},
        searchable_snapshot: {
          snapshot_repository: 'backing_repo',
        },
      },
    },
    delete: {
      min_age: '10d',
      actions: {
        wait_for_snapshot: {
          policy: 'policy',
        },
        delete: {
          delete_searchable_snapshot: true,
        },
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
