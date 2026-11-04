/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';

// Every Observability deployment, Cloud included, since they all run with the default config.
export const DIGITAL_EXPERIENCE_DISABLED_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.observability.all,
];

// Stateful only: the ux plugin, which owns the legacy navigation, is disabled on serverless.
export const DIGITAL_EXPERIENCE_DISABLED_WITH_UX_TAGS = tags.stateful.classic;
