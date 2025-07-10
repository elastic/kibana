/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

export const employeesIndexCreateRequest: IndicesCreateRequest = {
  index: 'employees-[environment].evaluations.[date]',
  mappings: {
    properties: {
      emp_no: {
        type: 'keyword',
      },
      hire_date: {
        type: 'date',
        format: 'yyyy-MM-dd',
      },
      salary: {
        type: 'double',
      },
    },
  },
};
