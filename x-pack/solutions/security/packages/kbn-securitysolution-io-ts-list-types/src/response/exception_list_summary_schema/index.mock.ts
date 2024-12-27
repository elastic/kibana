/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListSummarySchema } from '.';

export const getListSummaryResponseMock = (): ExceptionListSummarySchema => ({
  windows: 0,
  linux: 1,
  macos: 2,
  total: 3,
});
