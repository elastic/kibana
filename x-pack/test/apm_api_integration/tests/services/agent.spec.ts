/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';
  const range = archives[archiveName];
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  registry.when('Agent name when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(
        `/internal/apm/services/opbeans-node/agent?start=${start}&end=${end}`
      );

      expect(response.status).to.be(200);
      expect(response.body).to.eql({});
    });
  });

  registry.when(
    'Agent name when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the agent name', async () => {
        const response = await supertest.get(
          `/internal/apm/services/opbeans-node/agent?start=${start}&end=${end}`
        );

        expect(response.status).to.be(200);

        expect(response.body).to.eql({ agentName: 'nodejs', runtimeName: 'node' });
      });
    }
  );
}
