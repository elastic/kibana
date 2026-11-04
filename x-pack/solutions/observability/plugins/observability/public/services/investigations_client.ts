/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftInvestigationsRepositoryClient } from '@kbn/nightshift-investigations-plugin/public';

let investigationsClient: NightshiftInvestigationsRepositoryClient | undefined;

export const setInvestigationsClient = (client?: NightshiftInvestigationsRepositoryClient) => {
  investigationsClient = client;
};

export const getInvestigationsClient = () => investigationsClient;
