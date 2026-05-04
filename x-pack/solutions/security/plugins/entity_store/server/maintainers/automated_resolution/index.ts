/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import { ResolutionClient } from '../../domain/resolution';
import type { AutomatedResolutionState } from './types';
import { runAutomatedResolution } from './run';

const MAINTAINER_ID = 'automated-resolution';

const initialState: AutomatedResolutionState = {
  lastProcessedTimestamp: null,
  lastRun: null,
};

export const automatedResolutionMaintainerConfig: RegisterEntityMaintainerConfig = {
  id: MAINTAINER_ID,
  description: 'Automatically resolves entities using field-matching rules',
  interval: '5m',
  initialState,
  minLicense: 'enterprise',
  run: async ({ status, abortController, logger, esClient }) => {
    const namespace = status.metadata.namespace;
    const state = status.state as AutomatedResolutionState;
    const resolutionClient = new ResolutionClient({ logger, esClient, namespace });

    return runAutomatedResolution({
      state,
      namespace,
      esClient,
      logger,
      resolutionClient,
      abortController,
    });
  },
};
