/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalIds } from '@kbn/security-solution-plugin/common/detection_engine/schemas/common';

export const getQuerySignalIds = (signalIds: SignalIds) => ({
  query: {
    terms: {
      _id: signalIds,
    },
  },
});
