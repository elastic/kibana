/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EsqlQueryReadOnly } from './esql_query';

export default {
  component: EsqlQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/esql_query',
};

export const Default = () => (
  <EsqlQueryReadOnly
    esqlQuery={{
      query: `SELECT user.name, source.ip FROM "logs-*" WHERE event.action = 'user_login' AND event.outcome = 'failure'`,
      language: 'esql',
    }}
  />
);
