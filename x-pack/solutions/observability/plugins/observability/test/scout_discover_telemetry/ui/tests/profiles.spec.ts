/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { getEbtEvents } from '../fixtures/ebt';
import { test } from '../fixtures/discover_actions';
import { loadDiscoverTelemetryData, unloadDiscoverTelemetryData } from '../fixtures/setup';

test.describe(
  'Discover observability telemetry profiles',
  { tag: ['@local-serverless-observability_complete'] },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient }) => {
      await loadDiscoverTelemetryData({ esArchiver, kbnClient });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await unloadDiscoverTelemetryData({ kbnClient });
    });

    test('sends profile resolved events when the data source changes', async ({
      page,
      pageObjects,
      discoverEbt,
    }) => {
      const { discover } = pageObjects;
      await discover.goto({ queryMode: 'classic' });
      await discover.selectTextBaseLang();
      await discover.waitUntilSearchingHasFinished();
      await discoverEbt.submitRecordedEsqlQuery('from my-example-logs | sort @timestamp desc');

      let events = await getEbtEvents(page, ['discover_profile_resolved']);
      expect(events[0].properties).toStrictEqual({
        contextLevel: 'rootLevel',
        profileId: 'observability-root-profile',
      });
      expect(events[1].properties).toStrictEqual({
        contextLevel: 'dataSourceLevel',
        profileId: 'default-data-source-profile',
      });
      expect(events[2].properties).toStrictEqual({
        contextLevel: 'dataSourceLevel',
        profileId: 'observability-logs-data-source-profile',
      });

      await discover.submitQueryAndWait();
      events = await getEbtEvents(page, ['discover_profile_resolved']);
      expect(events).toHaveLength(3);

      await discover.writeAndSubmitEsqlQuery('from my-example-* | sort @timestamp desc');
      events = await getEbtEvents(page, ['discover_profile_resolved']);
      expect(events[3].properties).toStrictEqual({
        contextLevel: 'dataSourceLevel',
        profileId: 'default-data-source-profile',
      });
      expect(events).toHaveLength(4);
    });

    test('sends a profile resolved event when a document profile is resolved', async ({
      page,
      pageObjects,
      discoverEbt,
    }) => {
      const { discover, dataGrid } = pageObjects;
      await discover.goto({ queryMode: 'esql' });
      await discover.selectTextBaseLang();
      await discoverEbt.submitRecordedEsqlQuery('from my-example-logs | sort @timestamp desc');

      let events = await getEbtEvents(page, ['discover_profile_resolved']);
      expect(events).toHaveLength(2);

      await dataGrid.openDocumentDetails({ rowIndex: 0 });
      await expect(discover.isShowingDocViewer()).resolves.toBe(true);
      events = await getEbtEvents(page, ['discover_profile_resolved']);
      expect(events).toHaveLength(3);
      expect(events.at(-1)?.properties).toStrictEqual({
        contextLevel: 'documentLevel',
        profileId: 'observability-log-document-profile',
      });
    });
  }
);
