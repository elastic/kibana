/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/api_integration/ftr_provider_context';

export const ThreatHuntingHypothesesTestUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const kibanaServer = getService('kibanaServer');

  const getAllHypothesisSavedObjectDefinitions = async () => {
    const res = await kibanaServer.savedObjects.find({
      type: 'threat-hunting-hypothesis',
    });
    return res;
  };

  return {
    getAllHypothesisSavedObjectDefinitions,
  };
};
