/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsS3TotalRequests = createTSVBModel(
  'awsS3TotalRequests',
  ['aws.s3_request'],
  [
    {
      id: 'total',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.s3_request.requests.total',
          id: 'max-size',
          type: 'max',
        },
      ],
    },
  ],
  '>=300s'
);
