/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs, KibanaExecutionContext } from '@kbn/core/server';
import type { FtrProviderContext } from '../ftr_provider_context';
import { assertLogContains, isExecutionContextLog, readLogFile } from '../test_utils';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'timePicker']);

  describe('Browser apps', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('discover app', () => {
      let logs: Ecs[];

      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');
        await PageObjects.header.waitUntilLoadingHasFinished();
        logs = await readLogFile();
      });

      function checkExecutionContextEntry(expectedExecutionContext: KibanaExecutionContext) {
        return (record: Ecs) =>
          isExecutionContextLog(record, expectedExecutionContext) ||
          isExecutionContextLog(record, {
            ...expectedExecutionContext,
            // There is a race condition that makes these 2 fields to show up some times
            page: 'app',
            id: 'new',
          });
      }

      describe('propagates context for Discover', () => {
        it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: (record) =>
              Boolean(record.http?.request?.id?.includes('kibana:application:discover')),
            logs,
          });
        });

        it('propagates to Kibana logs (fetch documents)', async () => {
          await assertLogContains({
            description: 'execution context propagates to Kibana logs (fetch documents)',
            predicate: checkExecutionContextEntry({
              type: 'application',
              name: 'discover',
              url: '/app/discover',
              child: {
                name: 'discover',
                url: '/app/discover',
                type: 'application',
                page: 'app',
                id: 'new',
                description: 'fetch documents',
              },
            }),
            logs,
          });
        });

        it('propagates to Kibana logs (fetch chart data and total hits)', async () => {
          await assertLogContains({
            description:
              'execution context propagates to Kibana logs (fetch chart data and total hits)',
            predicate: checkExecutionContextEntry({
              type: 'application',
              name: 'discover',
              url: '/app/discover',
              child: {
                name: 'discover',
                url: '/app/discover',
                type: 'application',
                page: 'app',
                id: 'new',
                description: 'fetch chart data and total hits',
                child: {
                  type: 'lens',
                  name: 'lnsXY',
                  id: 'unifiedHistogramLensComponent',
                  description: 'Edit visualization',
                  url: '/app/lens#/edit_by_value',
                },
              },
            }),
            logs,
          });
        });
      });
    });

    describe('dashboard app', () => {
      let logs: Ecs[];

      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
        await PageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');
        await PageObjects.dashboard.waitForRenderComplete();
        await PageObjects.header.waitUntilLoadingHasFinished();
        logs = await readLogFile();
      });

      function checkHttpRequestId(suffix: string) {
        return (record: Ecs): boolean =>
          Boolean(
            [
              'kibana:application:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;',
              // Race conditions may miss the dashboard ID at the top level
              'kibana:application:dashboards:;',
              // Race conditions may assign the dashboard type to the top level
              'kibana:dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;',
            ].some((prefix) => record.http?.request?.id?.includes(`${prefix}${suffix}`))
          );
      }

      function checkExecutionContextEntry(expectedExecutionContext: KibanaExecutionContext) {
        return (record: Ecs) =>
          isExecutionContextLog(record, expectedExecutionContext) ||
          isExecutionContextLog(record, { ...expectedExecutionContext, page: 'list' }) ||
          isExecutionContextLog(record, { ...expectedExecutionContext, page: 'app' }) ||
          isExecutionContextLog(record, {
            ...expectedExecutionContext,
            // There is a race condition that makes this field to be missed sometimes
            page: 'app',
            id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
          }) ||
          isExecutionContextLog(record, {
            ...expectedExecutionContext,
            // There is a race condition that makes the top context to match the child one
            page: 'app',
            type: 'dashboard',
            id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
          }) ||
          isExecutionContextLog(record, {
            ...expectedExecutionContext,
            // There is a race condition that makes the top context to match the child one
            page: 'app',
            type: 'dashboard',
            id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
            description: '[Flights] Global Flight Dashboard',
          }) ||
          // Some race conditions misses one nested step
          (!!expectedExecutionContext.child &&
            isExecutionContextLog(record, expectedExecutionContext.child));
      }

      describe('propagates context for Lens visualizations', () => {
        describe('lnsXY', () => {
          it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
            await assertLogContains({
              description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
              predicate: checkHttpRequestId(
                'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsXY:086ac2e9-dd16-4b45-92b8-1e43ff7e3f65'
              ),
              logs,
            });
          });

          it('propagates to Kibana logs', async () => {
            await assertLogContains({
              description: 'execution context propagates to Kibana logs',
              predicate: checkExecutionContextEntry({
                type: 'application',
                name: 'dashboards',
                url: '/app/dashboards',
                child: {
                  name: 'dashboards',
                  url: '/app/dashboards',
                  type: 'dashboard',
                  page: 'app',
                  id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                  description: '[Flights] Global Flight Dashboard',
                  child: {
                    type: 'lens',
                    name: 'lnsXY',
                    id: '086ac2e9-dd16-4b45-92b8-1e43ff7e3f65',
                    description: '[Flights] Flight count',
                    url: '/app/lens#/edit_by_value',
                  },
                },
              }),
              logs,
            });
          });
        });

        describe('lnsMetric', () => {
          it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
            await assertLogContains({
              description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
              predicate: checkHttpRequestId(
                'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsMetric:b766e3b8-4544-46ed-99e6-9ecc4847e2a2'
              ),
              logs,
            });
          });

          it('propagates to Kibana logs', async () => {
            await assertLogContains({
              description: 'execution context propagates to Kibana logs',
              predicate: checkExecutionContextEntry({
                name: 'dashboards',
                url: '/app/dashboards',
                type: 'application',
                child: {
                  name: 'dashboards',
                  url: '/app/dashboards',
                  type: 'dashboard',
                  page: 'app',
                  id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                  description: '[Flights] Global Flight Dashboard',
                  child: {
                    type: 'lens',
                    name: 'lnsMetric',
                    id: 'b766e3b8-4544-46ed-99e6-9ecc4847e2a2',
                    description: '',
                    url: '/app/lens#/edit_by_value',
                  },
                },
              }),
              logs,
            });
          });
        });

        describe('lnsDatatable', () => {
          it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
            await assertLogContains({
              description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
              predicate: checkHttpRequestId(
                'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsDatatable:fb86b32f-fb7a-45cf-9511-f366fef51bbd'
              ),
              logs,
            });
          });

          it('propagates to Kibana logs', async () => {
            await assertLogContains({
              description: 'execution context propagates to Kibana logs',
              predicate: checkExecutionContextEntry({
                name: 'dashboards',
                url: '/app/dashboards',
                type: 'application',
                child: {
                  name: 'dashboards',
                  url: '/app/dashboards',
                  type: 'dashboard',
                  page: 'app',
                  id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                  description: '[Flights] Global Flight Dashboard',
                  child: {
                    type: 'lens',
                    name: 'lnsDatatable',
                    id: 'fb86b32f-fb7a-45cf-9511-f366fef51bbd',
                    description: 'Cities by delay, cancellation',
                    url: '/app/lens#/edit_by_value',
                  },
                },
              }),
              logs,
            });
          });
        });

        describe('lnsPie', () => {
          it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
            await assertLogContains({
              description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
              predicate: checkHttpRequestId(
                'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsPie:5d53db36-2d5a-4adc-af7b-cec4c1a294e0'
              ),
              logs,
            });
          });

          it('propagates to Kibana logs', async () => {
            await assertLogContains({
              description: 'execution context propagates to Kibana logs',
              predicate: checkExecutionContextEntry({
                name: 'dashboards',
                url: '/app/dashboards',
                type: 'application',
                child: {
                  name: 'dashboards',
                  url: '/app/dashboards',
                  type: 'dashboard',
                  page: 'app',
                  id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                  description: '[Flights] Global Flight Dashboard',
                  child: {
                    type: 'lens',
                    name: 'lnsPie',
                    id: '5d53db36-2d5a-4adc-af7b-cec4c1a294e0',
                    description: '[Flights] Delay Type',
                    url: '/app/lens#/edit_by_value',
                  },
                },
              }),
              logs,
            });
          });
        });
      });

      describe('propagates context for built-in Discover', () => {
        it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: checkHttpRequestId(
              'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;search:discover:571aaf70-4c88-11e8-b3d7-01146121b73d'
            ),
            logs,
          });
        });

        it('propagates to Kibana logs', async () => {
          await assertLogContains({
            description: 'execution context propagates to Kibana logs',
            predicate: checkExecutionContextEntry({
              type: 'application',
              name: 'dashboards',
              url: '/app/dashboards',
              child: {
                type: 'dashboard',
                name: 'dashboards',
                url: '/app/dashboards',
                page: 'app',
                id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                description: '[Flights] Global Flight Dashboard',
                child: {
                  type: 'search',
                  name: 'discover',
                  id: '571aaf70-4c88-11e8-b3d7-01146121b73d',
                  description: '[Flights] Flight Log',
                  url: '/app/discover#/view/571aaf70-4c88-11e8-b3d7-01146121b73d',
                },
              },
            }),
            logs,
          });
        });
      });

      // vega viz are flaky for some reason, skipping them to re-enable coverage on everything else
      describe.skip('propagates context for Vega visualizations', () => {
        it('propagates to Elasticsearch via "x-opaque-id" header', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: checkHttpRequestId(
              'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;agg_based:vega:ed78a660-53a0-11e8-acbd-0be0ad9d822b'
            ),
            logs,
          });
        });

        it('propagates to Kibana logs', async () => {
          await assertLogContains({
            description: 'execution context propagates to Kibana logs',
            predicate: checkExecutionContextEntry({
              name: 'dashboards',
              url: '/app/dashboards',
              type: 'application',
              child: {
                name: 'dashboards',
                url: '/app/dashboards',
                type: 'dashboard',
                page: 'app',
                id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
                description: '[Flights] Global Flight Dashboard',
                child: {
                  type: 'agg_based',
                  name: 'vega',
                  id: 'ed78a660-53a0-11e8-acbd-0be0ad9d822b',
                  description: '[Flights] Airport Connections (Hover Over Airport)',
                  url: '/app/visualize#/edit/ed78a660-53a0-11e8-acbd-0be0ad9d822b',
                },
              },
            }),
            logs,
          });
        });
      });
    });
  });
}
