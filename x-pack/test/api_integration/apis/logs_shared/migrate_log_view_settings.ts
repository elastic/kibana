/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LogViewAttributes } from '@kbn/logs-shared-plugin/common/log_views';
import { infraSourceConfigurationSavedObjectName } from '@kbn/infra-plugin/server/lib/sources';
import { logViewSavedObjectName } from '@kbn/logs-shared-plugin/server';
import { defaultLogViewId } from '@kbn/logs-shared-plugin/common/log_views';
import { MIGRATE_LOG_VIEW_SETTINGS_URL } from '@kbn/logs-shared-plugin/common/http_api/deprecations';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const logViewsService = getService('infraLogViews');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  const INDICES = 'logs-*,something-else-*,test-*';

  describe('Log view settings migration', () => {
    describe('Migration API', () => {
      before(async () => {
        await kibanaServer.savedObjects.clean({
          types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        });
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.clean({
          types: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        });
      });

      it('performs a migration when the log view is not using the Kibana advanced setting', async () => {
        const logViewAttributes: Partial<LogViewAttributes> = {
          name: 'Test Log View 1',
          description: 'Test Description 1',
          logIndices: { type: 'index_name', indexName: INDICES },
          logColumns: [],
        };

        await logViewsService.putLogView(defaultLogViewId, {
          attributes: logViewAttributes,
        });

        await supertest
          .put(MIGRATE_LOG_VIEW_SETTINGS_URL)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .send()
          .expect(200);

        await retry.try(async () => {
          const migratedLogView = await logViewsService.getLogView(defaultLogViewId);
          expect(migratedLogView.data.attributes.logIndices.type).to.eql('kibana_advanced_setting');
          const uiSetting = await kibanaServer.uiSettings.get(
            OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID
          );
          expect(uiSetting).to.eql([INDICES]);
        });
      });

      it('should error when the log view is already using the Kibana advanced setting', async () => {
        const logViewAttributes: Partial<LogViewAttributes> = {
          name: 'Test Log View 1',
          description: 'Test Description 1',
          logIndices: { type: 'kibana_advanced_setting' },
          logColumns: [],
        };

        await logViewsService.putLogView(defaultLogViewId, {
          attributes: logViewAttributes,
        });

        const response = await supertest
          .put(MIGRATE_LOG_VIEW_SETTINGS_URL)
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .send()
          .expect(400);

        expect(response.body.message).to.eql(
          "Unable to migrate log view settings. A log view either doesn't exist or is already using the Kibana advanced setting."
        );
      });
    });
  });
}
