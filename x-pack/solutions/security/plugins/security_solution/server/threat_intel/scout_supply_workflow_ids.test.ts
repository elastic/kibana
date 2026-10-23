/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SUPPLY_WORKFLOW_IDS } from '../../test/scout_alertzero/api/fixtures/supply_workflow_ids';

// The Scout fixtures inline these ids to stay light; a rename in `@kbn/workflows/managed`
// would otherwise leave the specs driving a workflow that no longer exists.
describe('Scout supply workflow ids', () => {
  it('match the managed workflow definitions', () => {
    expect(SUPPLY_WORKFLOW_IDS).toStrictEqual({
      ingest: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      enrich: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
    });
  });
});
