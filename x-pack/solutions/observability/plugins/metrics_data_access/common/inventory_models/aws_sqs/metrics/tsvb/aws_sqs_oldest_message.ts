/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsSQSOldestMessage = createTSVBModel(
  'awsSQSOldestMessage',
  ['aws.sqs'],
  [
    {
      id: 'oldest',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.sqs.oldest_message_age.sec',
          id: 'max-oldest',
          type: 'max',
        },
      ],
    },
  ],
  '>=300s'
);
