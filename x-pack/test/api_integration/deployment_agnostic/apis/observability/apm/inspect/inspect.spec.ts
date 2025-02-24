/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';
import archives_metadata from '../constants/archives_metadata';

export default function inspectFlagTests({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');

  const archiveName = '8.0.0';
  const metadata = archives_metadata['apm_8.0.0'];

  describe('Inspect feature', () => {
    before(async () => {
      await esArchiver.load(ARCHIVER_ROUTES[archiveName]);
    });
    after(async () => {
      await esArchiver.unload(ARCHIVER_ROUTES[archiveName]);
    });

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

      describe('elasticsearch calls made with internal user should not leak internal queries', () => {
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
      });
    });
  });
}
