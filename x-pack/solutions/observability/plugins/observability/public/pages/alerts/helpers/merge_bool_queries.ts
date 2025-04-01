/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoolQuery } from '@kbn/es-query';

export const mergeBoolQueries = (
  firstQuery: { bool: BoolQuery },
  secondQuery: { bool: BoolQuery }
): { bool: BoolQuery } => {
  const first = firstQuery.bool;
  const second = secondQuery.bool;

  return {
    bool: {
      must: [...first.must, ...second.must],
      must_not: [...first.must_not, ...second.must_not],
      filter: [...first.filter, ...second.filter],
      should: [...first.should, ...second.should],
    },
  };
};
