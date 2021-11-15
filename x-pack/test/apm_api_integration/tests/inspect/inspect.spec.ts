/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';

export default function customLinksTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  registry.when('Inspect feature', { config: 'trial', archives: [archiveName] }, () => {
    describe('when omitting `_inspect` query param', () => {
      it('returns response without `_inspect`', async () => {
        const { status, body } = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/environments',
          params: {
            query: {
              start: metadata.start,
              end: metadata.end,
            },
          },
        });

        expect(status).to.be(200);
        expect(body._inspect).to.be(undefined);
      });
    });

    describe('when passing `_inspect` as query param', () => {
      describe('elasticsearch calls made with end-user auth are returned', () => {
        it('for environments', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/environments',
            params: {
              query: {
                start: metadata.start,
                end: metadata.end,
                _inspect: true,
              },
            },
          });
          expect(status).to.be(200);
          expect(body._inspect).not.to.be.empty();

          // @ts-expect-error
          expect(Object.keys(body._inspect[0])).to.eql([
            'id',
            'json',
            'name',
            'response',
            'startTime',
            'stats',
            'status',
          ]);
        });
      });

      describe('elasticsearch calls made with internal user are not return', () => {
        it('for custom links', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/settings/custom_links',
            params: {
              query: {
                'service.name': 'opbeans-node',
                'transaction.type': 'request',
                _inspect: true,
              },
            },
          });

          expect(status).to.be(200);
          expect(body._inspect).to.eql([]);
        });

        it('for agent configs', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/settings/agent-configuration',
            params: {
              query: {
                _inspect: true,
              },
            },
          });

          expect(status).to.be(200);
          expect(body._inspect).to.eql([]);
        });
      });
    });
  });
}
