/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildStatusesKuery } from './agent_status';

describe('buildStatusesKuery', () => {
  it('correctly builds kuery for healthy status', () => {
    const status = ['healthy'];
    const kuery = buildStatusesKuery(status);
    expect(kuery).toMatchInlineSnapshot(`"(status:online)"`);
  });

  it('correctly builds kuery for offline status', () => {
    const status = ['offline'];
    const kuery = buildStatusesKuery(status);
    expect(kuery).toMatchInlineSnapshot(`"(status:offline)"`);
  });

  it('correctly builds kuery for unhealthy status', () => {
    const status = ['unhealthy'];
    const kuery = buildStatusesKuery(status);
    expect(kuery).toMatchInlineSnapshot(`"((status:error or status:degraded))"`);
  });

  it('correctly builds kuery for updating status', () => {
    const status = ['updating'];
    const kuery = buildStatusesKuery(status);
    expect(kuery).toMatchInlineSnapshot(
      `"((status:updating or status:unenrolling or status:enrolling))"`
    );
  });

  it('correctly builds kuery for inactive status', () => {
    const status = ['inactive'];
    const kuery = buildStatusesKuery(status);
    expect(kuery).toMatchInlineSnapshot(`"(status:inactive)"`);
  });

  it('correctly builds kuery for unenrolled status', () => {
    const status = ['unenrolled'];
    const kuery = buildStatusesKuery(status);
    expect(kuery).toMatchInlineSnapshot(`"(status:unenrolled)"`);
  });

  it('correctly builds kuery for multiple statuses', () => {
    const statuses = ['offline', 'unhealthy'];
    const kuery = buildStatusesKuery(statuses);
    expect(kuery).toMatchInlineSnapshot(`"(status:offline OR (status:error or status:degraded))"`);
  });
});
