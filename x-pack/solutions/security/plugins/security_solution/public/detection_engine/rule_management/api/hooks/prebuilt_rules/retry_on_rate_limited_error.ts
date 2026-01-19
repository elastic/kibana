/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

/*
  Prebuilt rule operations like install and upgrade are rate limited to one at a
  time. In most cases it is fine to wait for the other operation to finish using
  the retry logic.

  429 can be caused by a user clicking multiple times on the install or upgrade
  rule buttons and in most cases the operations can be performed in succession
  without any conflicts.
  */
export const retryOnRateLimitedError = (failureCount: number, error: unknown) => {
  const statusCode = get(error, 'response.status');
  return statusCode === 429;
};
