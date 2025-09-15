/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIRequestContext } from '@playwright/test';
import { getCommonHeaders } from './headers';

export const deleteAllSecurityDocuments = async (request: APIRequestContext) => {
  const securityIndexes = `.lists-*,.items-*,.alerts-security.alerts-*`;
  const headers = await getCommonHeaders();

  await request.post(`${process.env.ELASTICSEARCH_URL}/${securityIndexes}/_refresh`, {
    headers,
  });

  await request.post(
    `${process.env.ELASTICSEARCH_URL}/${securityIndexes}/_delete_by_query?conflicts=proceed&scroll_size=10000&refresh`,
    {
      headers,
      data: {
        query: {
          match_all: {},
        },
      },
    }
  );
};
