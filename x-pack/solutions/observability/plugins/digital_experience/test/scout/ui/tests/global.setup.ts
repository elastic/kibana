/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { ES_ARCHIVES } from '../../common/fixtures/constants';
import { ingestOtelRumData } from '../../common/fixtures/otel_rum_data';
import { ingestSessionsData } from '../../common/fixtures/sessions_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

globalSetupHook(
  'Ingest RUM test data',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  async ({ apiServices, esArchiver, esClient, kbnClient, config }) => {
    await ingestOtelRumData(esClient);

    // Setting up sessions calls a Digital Experience route, which answers 404 while the flag is
    // off.
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
    try {
      await ingestSessionsData(esClient, kbnClient);
    } finally {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    }

    // CI runs the setup in every lane of this config; only stateful specs read Classic RUM data,
    // and the archive's ILM settings do not exist on serverless.
    if (config.serverless) {
      return;
    }
    await esArchiver.loadIfNeeded(ES_ARCHIVES.RUM_TEST_DATA);
  }
);
