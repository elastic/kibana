/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraTimerangeInput } from '../../../../../common/http_api';

export const createLogRateAggs = (timerange: InfraTimerangeInput, id: string) => {
  const intervalInSeconds = (timerange.to - timerange.from) / 1000;
  return {
    [id]: {
      bucket_script: {
        buckets_path: {
          count: `_count`,
        },
        script: `params.count > 0.0 ? params.count / ${intervalInSeconds}: null`,
      },
    },
  };
};
