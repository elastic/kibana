/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKER_SERVER_DEFINITIONS } from '.';

describe('WORKER_SERVER_DEFINITIONS', () => {
  it('lists each Worker once', () => {
    const workerIds = WORKER_SERVER_DEFINITIONS.map(({ workerId }) => workerId);

    expect(workerIds.filter((workerId, index) => workerIds.indexOf(workerId) !== index)).toEqual(
      []
    );
  });
});
