/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '@kbn/security-mitre-attack-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const mitreAttackApi = getService('mitreAttackApi');
  const es = getService('es');

  describe('@ess @serverless Feature flag disabled', () => {
    it('returns 404 when managedSourceEnabled=false', async () => {
      const { status } = await mitreAttackApi.getEntities();
      expect(status).to.eql(404);
    });

    it('no mitre-attack-entity saved objects are created when managedSourceEnabled=false', async () => {
      const result = await es.count({
        index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
        query: { term: { type: MITRE_ATTACK_ENTITY_SO_TYPE } },
      });

      expect(result.count).to.eql(0);
    });
  });
};
