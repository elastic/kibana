/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';

globalSetupHook(
  'Setup environment for SLO tests',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  async ({ sloData }) => {
    await sloData.generateSloData();
    await sloData.addSLO();
  }
);
