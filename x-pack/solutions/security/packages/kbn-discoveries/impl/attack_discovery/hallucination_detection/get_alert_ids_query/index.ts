/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AlertIdsQuery {
  _source: false;
  ignore_unavailable: boolean;
  index: string;
  query: {
    ids: {
      values: string[];
    };
  };
  size: number;
}

export const getAlertIdsQuery = (
  alertsIndexPattern: string,
  alertIds: string[]
): AlertIdsQuery => ({
  _source: false,
  ignore_unavailable: true,
  index: alertsIndexPattern,
  query: {
    ids: {
      values: alertIds,
    },
  },
  size: alertIds.length,
});
