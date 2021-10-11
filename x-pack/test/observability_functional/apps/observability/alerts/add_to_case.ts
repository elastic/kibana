/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  describe('Observability alerts / Add to case', function () {
    this.tags('includeFirefox');

    // const retry = getService('retry');
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('When user has all priviledges', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCases: ['all'],
            logs: ['all'],
          })
        );
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('test', () => {
        expect(true).to.be(true);
      });
    });

    describe('When user has read permissions', () => {
      before(async () => {
        await observability.users.setTestUserRole(
          observability.users.defineBasicObservabilityRole({
            observabilityCases: ['read'],
            logs: ['all'],
          })
        );
      });

      after(async () => {
        await observability.users.restoreDefaultTestUserRole();
      });

      it('test', () => {
        expect(true).to.be(true);
      });
    });
  });
};
