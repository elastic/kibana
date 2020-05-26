/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { isRight } from 'fp-ts/lib/Either';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';
import { CertType } from '../../../../../plugins/uptime/common/runtime_types';
import { makeChecksWithStatus } from './helper/make_checks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const legacyEsService = getService('legacyEs');
  const esArchiver = getService('esArchiver');

  describe('certs api', () => {
    describe('empty index', async () => {
      it('returns empty array for no data', async () => {
        const apiResponse = await supertest.get(API_URLS.CERTS);
        expect(JSON.stringify(apiResponse.body)).to.eql('{"certs":[],"total":0}');
      });
    });

    describe('when data is present', async () => {
      const now = moment();
      const cnva = now.add(6, 'months').toISOString();
      const cnvb = now.subtract(23, 'weeks').toISOString();
      const monitorId = 'monitor1';
      before(async () => {
        makeChecksWithStatus(
          legacyEsService,
          monitorId,
          3,
          1,
          10000,
          {
            tls: {
              server: {
                x509: {
                  not_after: cnva,
                  not_before: cnvb,
                  issuer: {
                    common_name: 'issuer-common-name',
                  },
                  subject: {
                    common_name: 'subject-common-name',
                  },
                },
                hash: {
                  sha1: 'fewjio23r3',
                  sha256: 'few9023fijoefw',
                },
              },
            },
          },
          'up',
          (d: any) => d
        );
      });
      after('unload test docs', () => {
        esArchiver.unload('uptime/blank');
      });

      it('retrieves expected cert data', async () => {
        const apiResponse = await supertest.get(API_URLS.CERTS);
        const { body } = apiResponse;

        expect(body.certs).not.to.be(undefined);
        expect(Array.isArray(body.certs)).to.be(true);
        expect(body.certs).to.have.length(1);

        const decoded = CertType.decode(body.certs[0]);
        expect(isRight(decoded)).to.be(true);

        const cert = body.certs[0];
        expect(Array.isArray(cert.monitors)).to.be(true);
        expect(cert.monitors[0]).to.eql({
          id: monitorId,
          url: 'http://localhost:5678/pattern?r=200x5,500x1',
        });
        expect(cert.not_after).to.eql(cnva);
        expect(cert.not_before).to.eql(cnvb);
        expect(cert.common_name).to.eql('subject-common-name');
        expect(cert.issuer).to.eql('issuer-common-name');
      });
    });
  });
}
