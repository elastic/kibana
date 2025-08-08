/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { enablePrivmonSetting } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const kibanaServer = getService('kibanaServer');
    before(async () => {
      await dataView.create('security-solution');
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await dataView.delete('security-solution');
    });

    describe('health', () => {
      it('should be healthy', async () => {
        log.info(`Checking health of privilege monitoring`);
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error(`Health check failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
      });
    });

    describe('init', () => {
      it('should be able to be called multiple times', async () => {
        log.info(`Initializing Privilege Monitoring engine`);
        const res1 = await api.initMonitoringEngine();

        if (res1.status !== 200) {
          log.error(`Failed to initialize engine`);
          log.error(JSON.stringify(res1.body));
        }

        expect(res1.status).eql(200);

        log.info(`Re-initializing Privilege Monitoring engine`);
        const res2 = await api.initMonitoringEngine();
        if (res2.status !== 200) {
          log.error(`Failed to re-initialize engine`);
          log.error(JSON.stringify(res2.body));
        }

        expect(res2.status).eql(200);
      });
    });
  });
};
