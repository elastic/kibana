/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVENTORY_PACK_BODY } from './pack_body';

/** Pins the fields osquery's `validatePackScheduleFields` and create-pack schema check. */
describe('INVENTORY_PACK_BODY', () => {
  it('does not carry per-query schedule fields', () => {
    Object.values(INVENTORY_PACK_BODY.queries).forEach((query) => {
      expect(Object.keys(query).sort()).toEqual(['id', 'platform', 'query', 'snapshot']);
    });
  });

  it('only uses top-level keys the osquery create-pack schema accepts', () => {
    const accepted = [
      'name',
      'description',
      'enabled',
      'policy_ids',
      'shards',
      'queries',
      'schedule_type',
      'interval',
      'rrule_schedule',
      'min_osquery_version',
      'result_type',
      'platform',
    ];
    expect(Object.keys(INVENTORY_PACK_BODY).filter((key) => !accepted.includes(key))).toEqual([]);
  });
});
