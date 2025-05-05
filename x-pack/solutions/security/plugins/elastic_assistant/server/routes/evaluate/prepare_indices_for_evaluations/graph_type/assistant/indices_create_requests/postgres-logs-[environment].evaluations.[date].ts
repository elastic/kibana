/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

export const postgresLogsIndexCreateRequest: IndicesCreateRequest = {
  index: 'postgres-logs-[environment].evaluations.[date]',
  mappings: {
    properties: {
      message: {
        type: 'text',
      },
    },
  },
};
