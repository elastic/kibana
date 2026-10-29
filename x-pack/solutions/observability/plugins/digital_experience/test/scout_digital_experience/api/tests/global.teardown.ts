/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-oblt';
import { deleteOtelRumData } from '../../common/fixtures/otel_rum_data';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

// The mock OTel documents live in shared data streams; the Classic RUM archive is left loaded, as
// Scout's `esArchiver` has no unload.
globalTeardownHook(
  'Delete the mock OTel RUM data',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  async ({ esClient }) => {
    await deleteOtelRumData(esClient);
  }
);
