/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-oblt';
import { deleteMobileData } from '../../common/fixtures/mobile_data';
import { deleteOtelRumData } from '../../common/fixtures/otel_rum_data';
import { deleteTimeZoneData } from '../../common/fixtures/time_zone_data';
import { FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_DISABLED_TAGS, DIGITAL_EXPERIENCE_TAGS } from '../../tags';

// The mock OTel documents live in shared data streams; the Classic RUM archive is left loaded, as
// Scout's `esArchiver` has no unload.
globalTeardownHook(
  'Delete the mock OTel RUM data',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  async ({ esClient }) => {
    // Every cleanup runs, whichever fails; the failures are reported together.
    const results = await Promise.allSettled([
      deleteOtelRumData(esClient),
      deleteTimeZoneData(esClient),
      deleteMobileData(esClient),
    ]);
    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    );
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Could not delete all of the test data');
    }
  }
);

// Each spec resets the flag it set; this covers a spec that stopped before its `afterAll`.
globalTeardownHook(
  'Restore the Digital Experience feature flag',
  { tag: DIGITAL_EXPERIENCE_DISABLED_TAGS },
  async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  }
);
