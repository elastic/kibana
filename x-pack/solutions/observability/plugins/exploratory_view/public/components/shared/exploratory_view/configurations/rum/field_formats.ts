/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTR_TRANSACTION_DURATION_US,
  ATTR_TRANSACTION_EXPERIENCE_FID,
  ATTR_TRANSACTION_EXPERIENCE_TBT,
  ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
  ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
  ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
} from '@kbn/observability-ui-semantic-conventions';
import { FieldFormat } from '../../types';

export const rumFieldFormats: FieldFormat[] = [
  {
    field: ATTR_TRANSACTION_DURATION_US,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'microseconds',
        outputFormat: 'asSeconds',
        showSuffix: true,
        outputPrecision: 1,
        useShortSuffix: true,
      },
    },
  },
  {
    field: ATTR_TRANSACTION_MARKS_AGENT_FIRST_CONTENTFUL_PAINT,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'humanizePrecise',
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
  {
    field: ATTR_TRANSACTION_MARKS_AGENT_LARGEST_CONTENTFUL_PAINT,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'humanizePrecise',
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
  {
    field: ATTR_TRANSACTION_EXPERIENCE_TBT,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'humanizePrecise',
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
  {
    field: ATTR_TRANSACTION_EXPERIENCE_FID,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'humanizePrecise',
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
  {
    field: ATTR_TRANSACTION_EXPERIENCE_FID,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'humanizePrecise',
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
  {
    field: ATTR_TRANSACTION_MARKS_AGENT_TIME_TO_FIRST_BYTE,
    format: {
      id: 'duration',
      params: {
        inputFormat: 'milliseconds',
        outputFormat: 'humanizePrecise',
        showSuffix: true,
        useShortSuffix: true,
      },
    },
  },
];
