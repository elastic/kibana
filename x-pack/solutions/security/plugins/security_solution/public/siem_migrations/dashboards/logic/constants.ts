/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ONE_MINUTE = 60000;

export const DEFAULT_QUERY_OPTIONS = {
  refetchIntervalInBackground: false,
  staleTime: ONE_MINUTE * 5,
};
