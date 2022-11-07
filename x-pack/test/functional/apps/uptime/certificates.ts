/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { makeCheck } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { getSha256 } from '../../../api_integration/apis/uptime/rest/helper/make_tls';
import { UPTIME_HEARTBEAT_DATA } from './overview';

const BLANK_INDEX_PATH = 'x-pack/test/functional/es_archives/uptime/blank';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime } = getPageObjects(['uptime']);
  const uptimeService = getService('uptime');

  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('certificates', function () {
    describe('empty certificates', function () {
      before(async () => {
        await esArchiver.load(UPTIME_HEARTBEAT_DATA);
        await uptime.goToRoot(true);
      });

      after(async () => {
        await esArchiver.unload(UPTIME_HEARTBEAT_DATA);
      });

      it('go to certs page', async () => {
        await uptime.dismissTour();
        await uptimeService.common.waitUntilDataIsLoaded();
        await uptimeService.cert.hasViewCertButton();
        await uptimeService.navigation.goToCertificates();
      });
      it('displays empty message', async () => {
        await uptimeService.cert.displaysEmptyMessage();
      });
    });

    describe('with certs', function () {
      before(async () => {
        await esArchiver.load(BLANK_INDEX_PATH);
        await makeCheck({ es, tls: true });
        await uptime.goToRoot(true);
      });

      after(async () => {
        await esArchiver.unload(BLANK_INDEX_PATH);
      });

      beforeEach(async () => {
        await makeCheck({ es, tls: true });
      });

      it('can navigate to cert page', async () => {
        await uptimeService.common.waitUntilDataIsLoaded();
        await uptimeService.cert.hasViewCertButton();
        await uptimeService.navigation.goToCertificates();
      });

      describe('page', () => {
        beforeEach(async () => {
          await uptimeService.navigation.goToCertificates();
          await uptimeService.navigation.refreshApp();
        });

        it('displays certificates', async () => {
          await uptimeService.cert.hasCertificates();
        });

        it('displays specific certificates', async () => {
          const certId = getSha256();
          const { monitorId } = await makeCheck({
            es,
            tls: {
              sha256: certId,
            },
          });

          await uptimeService.navigation.refreshApp();
          await uptimeService.cert.certificateExists({ certId, monitorId });
        });

        it('performs search against monitor id', async () => {
          const certId = getSha256();
          const { monitorId } = await makeCheck({
            es,
            monitorId: 'cert-test-check-id',
            fields: {
              monitor: {
                name: 'Cert Test Check',
              },
              url: {
                full: 'https://site-to-check.com/',
              },
            },
            tls: {
              sha256: certId,
            },
          });
          await uptimeService.navigation.refreshApp();
          await uptimeService.cert.searchIsWorking(monitorId);
        });
      });
    });
  });
};
