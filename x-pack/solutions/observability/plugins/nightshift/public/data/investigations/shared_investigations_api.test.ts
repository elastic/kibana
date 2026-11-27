/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_SEVERITY_COUNTS_URL,
  INVESTIGATION_SEVERITIES,
} from '@kbn/agentic-investigations-plugin/common';
import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import {
  SHARED_INVESTIGATIONS_API_VERSION,
  SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL,
  SHARED_INVESTIGATIONS_URL,
} from './shared_investigations_api';

describe('shared investigations API', () => {
  it('spells out the routes of the agentic investigations plugin', () => {
    expect(SHARED_INVESTIGATIONS_URL).toBe(INVESTIGATIONS_INTERNAL_URL);
    expect(SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL).toBe(INVESTIGATIONS_SEVERITY_COUNTS_URL);
    expect(SHARED_INVESTIGATIONS_API_VERSION).toBe(AGENTIC_INVESTIGATIONS_API_VERSION);
  });

  it('has a severity tier for every investigation severity', () => {
    expect([...SEVERITY_OPTIONS].sort()).toEqual([...INVESTIGATION_SEVERITIES].sort());
  });
});
