/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerServerContext } from '../../../workers/types';
import type { HuntServices } from './types';

type HuntServicesContext = Pick<
  WorkerServerContext,
  'getProposalsPlugin' | 'getInference' | 'getSearchInferenceEndpoints' | 'getMitreDataClient'
>;

/** Builds Hunt's services from the Worker context; each resolves only when read. */
export const createHuntServices = ({
  getProposalsPlugin,
  getInference,
  getSearchInferenceEndpoints,
  getMitreDataClient,
}: HuntServicesContext): HuntServices => ({
  getProposalsService: () => getProposalsPlugin().getProposalsService(),
  getProposalPrivileges: () => getProposalsPlugin().getProposalPrivileges(),
  getInference,
  getSearchInferenceEndpoints,
  get mitreDataClient() {
    return getMitreDataClient();
  },
});
