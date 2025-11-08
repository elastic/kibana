/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const spacesService = getService('spaces');

  const deleteAllThreatHuntingHypothesesSavedObjects = async () => {
    await es.deleteByQuery({
      index: '.kibana*',
      refresh: true,
      ignore_unavailable: true,
      body: {
        query: {
          term: { type: 'threat-hunting-hypothesis' },
        },
      },
    });
  };
  // can you mock hypothesis definitions OR the HYPOTHESIS_VERSION?
  // if latter then you can change the version to force reconciliation
  describe('@ess @serverless @skipInServerlessMKI Threat Hunting Hypotheses Initialisation and Reconciliation ', () => {
    before(async () => {
      await deleteAllThreatHuntingHypothesesSavedObjects();
      const HYPOTHESES_VERSION_TEST = 1;
      const hypotheses = getHypothesisDefinitions(HYPOTHESES_VERSION_TEST);
      // 1. make sure feature flag is on
    });
    it('should initialise Threat Hunting Hypotheses definitions on startup', async () => {
      /**
       * 1. confirm the hard coded list and the list of saved objects match
       * 2. confirm using version 1 matching all in the list
       * 3. confirm logging
       * 4. confirm auditing
       * 5. confirm idempotent
       */
    });
    it('should reconcile Threat Hunting Hypotheses definitions', async () => {
      /**
       * 1. confirm if version bumps, and there are removed from registry,
       *    they get removed from saved objects via DELETE
       * 2. confirm if version bumps, and there are additions to registry,
       *    they get added to saved objects via CREATE
       * 3. confirm if version bumps, and there are updates to existing definitions in registry,
       *    they get updated in saved objects via UPDATE
       * 4. confirm logging
       * 5. confirm auditing
       */
    });
  });
};
