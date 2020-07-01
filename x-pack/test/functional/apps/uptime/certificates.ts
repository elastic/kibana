/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { makeCheck } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { getSha256 } from '../../../api_integration/apis/uptime/rest/helper/make_tls';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime } = getPageObjects(['uptime']);
  const uptimeService = getService('uptime');

  const es = getService('es');

  // Failing: See https://github.com/elastic/kibana/issues/70493
  describe.skip('certificates', function () {
    before(async () => {
      await makeCheck({ es, tls: true });
      await uptime.goToRoot(true);
    });

    beforeEach(async () => {
      await makeCheck({ es, tls: true });
    });

    it('can navigate to cert page', async () => {
      await uptimeService.cert.isUptimeDataMissing();
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
          tls: {
            sha256: certId,
          },
        });
        await uptimeService.navigation.refreshApp();
        await uptimeService.cert.searchIsWorking(monitorId);
      });
    });
  });
};
