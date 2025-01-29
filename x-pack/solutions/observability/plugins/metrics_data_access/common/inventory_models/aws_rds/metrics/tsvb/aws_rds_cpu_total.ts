/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsRDSCpuTotal = createTSVBModel(
  'awsRDSCpuTotal',
  ['aws.rds'],
  [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.cpu.total.pct',
          id: 'avg-cpu',
          type: 'avg',
        },
        {
          id: 'convert-to-percent',
          script: 'params.avg',
          type: 'calculation',
          variables: [
            {
              field: 'avg-cpu',
              id: 'var-avg',
              name: 'avg',
            },
          ],
        },
      ],
    },
  ]
);
