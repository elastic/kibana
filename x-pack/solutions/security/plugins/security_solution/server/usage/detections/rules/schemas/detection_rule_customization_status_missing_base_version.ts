/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { RuleCustomizationCounts } from '../types';

export const ruleCustomizedFieldsMissingBaseVersionCounts: MakeSchemaFrom<RuleCustomizationCounts> =
  {
    alert_suppression: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized alert_suppression field',
      },
    },
    anomaly_threshold: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized anomaly_threshold field',
      },
    },
    data_view_id: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized data_view_id field',
      },
    },
    description: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized description field',
      },
    },
    filters: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized filters field',
      },
    },
    from: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized from field',
      },
    },
    index: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized index field',
      },
    },
    interval: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized interval field',
      },
    },
    investigation_fields: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized investigation_fields field',
      },
    },
    name: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized name field',
      },
    },
    new_terms_fields: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized new_terms_fields field',
      },
    },
    note: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized note field',
      },
    },
    query: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized query field',
      },
    },
    risk_score: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized risk_score field',
      },
    },
    severity: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized severity field',
      },
    },
    setup: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized setup field',
      },
    },
    tags: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized tags field',
      },
    },
    threat_query: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized threat_query field',
      },
    },
    threshold: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized threshold field',
      },
    },
    timeline_id: {
      type: 'long',
      _meta: {
        description:
          'The number of prebuilt rules missing a base version with customized timeline_id field',
      },
    },
  };
