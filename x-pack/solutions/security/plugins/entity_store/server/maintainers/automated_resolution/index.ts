/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import { ResolutionClient } from '../../domain/resolution/resolution_client';
import { runAutomatedResolution } from './run';
import type { AutomatedResolutionState } from './types';

export const AUTOMATED_RESOLUTION_MAINTAINER_ID = 'automated-resolution';

const INITIAL_STATE: AutomatedResolutionState = {
  lastProcessedTimestamp: null,
  totalResolutionsCreated: 0,
  lastRun: null,
};

export const automatedResolutionMaintainerConfig: RegisterEntityMaintainerConfig = {
  id: AUTOMATED_RESOLUTION_MAINTAINER_ID,
  description: 'Automatically resolves user entities sharing the same email address',
  interval: '5m',
  initialState: INITIAL_STATE,
  run: async ({ status, esClient, logger, abortController }) => {
    const { namespace } = status.metadata;
    const resolutionClient = new ResolutionClient({ logger, esClient, namespace });
    return runAutomatedResolution({ status, esClient, resolutionClient, logger, abortController });
  },
};
