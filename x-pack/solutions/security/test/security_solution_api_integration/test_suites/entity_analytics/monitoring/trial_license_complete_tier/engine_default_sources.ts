/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring Engine Default Sources', () => {
    describe('default entity sources', () => {
      beforeEach(async () => {});
      afterEach(async () => {
        await api.deleteMonitoringEngine({ query: { data: true } });
      });

      it('should create default entity sources on privileged monitoring engine initialization', async () => {
        await privMonUtils.initPrivMonEngine();

        const {
          body: { sources },
        } = await api.listEntitySources({ query: {} });
        const names = sources.map((s: any) => s.name);
        const syncMarkersIndices = sources.map((s: any) => s.integrations?.syncMarkerIndex);
        // confirm default sources have been created
        expect(names).toEqual(
          expect.arrayContaining([
            '.entity_analytics.monitoring.sources.entityanalytics_okta-default',
            '.entity_analytics.monitoring.sources.entityanalytics_ad-default',
            '.entity_analytics.monitoring.users-default',
          ])
        );
        expect(syncMarkersIndices).toEqual(
          expect.arrayContaining([
            undefined, // default users source has no sync marker since index does not use sync markers
            'logs-entityanalytics_okta.entity-default', // okta sync markers source
            'logs-entityanalytics_ad.user-default', // ad sync markers source
          ])
        );
      });
    });
  });
};
