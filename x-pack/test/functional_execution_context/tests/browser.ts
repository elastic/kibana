/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ecs, KibanaExecutionContext } from '@kbn/core/server';
import type { FtrProviderContext } from '../ftr_provider_context';
import { assertLogContains, forceSyncLogFile, isExecutionContextLog } from '../test_utils';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home']);
  const retry = getService('retry');

  describe('Browser apps', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    describe('discover app', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await forceSyncLogFile();
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

      it('propagates context for Discover', async () => {
        await assertLogContains({
          description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
          predicate: (record) =>
            Boolean(record.http?.request?.id?.includes('kibana:application:discover')),
          retry,
        });

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
          retry,
        });

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
          retry,
        });
      });
    });

    describe('dashboard app', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
        await PageObjects.dashboard.waitForRenderComplete();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await forceSyncLogFile();
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
        it('lnsXY', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: checkHttpRequestId(
              'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsXY:086ac2e9-dd16-4b45-92b8-1e43ff7e3f65'
            ),
            retry,
          });

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
            retry,
          });
        });

        it('lnsMetric', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: checkHttpRequestId(
              'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsLegacyMetric:b766e3b8-4544-46ed-99e6-9ecc4847e2a2'
            ),
            retry,
          });

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
                  name: 'lnsLegacyMetric',
                  id: 'b766e3b8-4544-46ed-99e6-9ecc4847e2a2',
                  description: '',
                  url: '/app/lens#/edit_by_value',
                },
              },
            }),
            retry,
          });
        });

        it('lnsDatatable', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: checkHttpRequestId(
              'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsDatatable:fb86b32f-fb7a-45cf-9511-f366fef51bbd'
            ),
            retry,
          });

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
            retry,
          });
        });

        it('lnsPie', async () => {
          await assertLogContains({
            description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
            predicate: checkHttpRequestId(
              'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;lens:lnsPie:5d53db36-2d5a-4adc-af7b-cec4c1a294e0'
            ),
            retry,
          });
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
            retry,
          });
        });
      });

      it('propagates context for built-in Discover', async () => {
        await assertLogContains({
          description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
          predicate: checkHttpRequestId(
            'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;search:discover:571aaf70-4c88-11e8-b3d7-01146121b73d'
          ),
          retry,
        });
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
          retry,
        });
      });

      it('propagates context for TSVB visualizations', async () => {
        await assertLogContains({
          description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
          predicate: checkHttpRequestId('agg_based:metrics:bcb63b50-4c89-11e8-b3d7-01146121b73d'),
          retry,
        });

        await assertLogContains({
          description: 'execution context propagates to Kibana logs',
          predicate: checkExecutionContextEntry({
            name: 'dashboards',
            url: '/app/dashboards',
            type: 'application',
            page: 'app',
            description: '[Flights] Global Flight Dashboard',
            child: {
              type: 'agg_based',
              name: 'metrics',
              id: 'bcb63b50-4c89-11e8-b3d7-01146121b73d',
              description: '[Flights] Delays & Cancellations',
              url: '/app/visualize#/edit/bcb63b50-4c89-11e8-b3d7-01146121b73d',
            },
          }),
          retry,
        });
      });

      it('propagates context for Vega visualizations', async () => {
        await assertLogContains({
          description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
          predicate: checkHttpRequestId(
            'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;agg_based:vega:ed78a660-53a0-11e8-acbd-0be0ad9d822b'
          ),
          retry,
        });

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
          retry,
        });
      });

      it('propagates context for Tag Cloud visualization', async () => {
        await assertLogContains({
          description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
          predicate: checkHttpRequestId(
            'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;agg_based:tagcloud:293b5a30-4c8f-11e8-b3d7-01146121b73d'
          ),
          retry,
        });

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
                name: 'tagcloud',
                id: '293b5a30-4c8f-11e8-b3d7-01146121b73d',
                description: '[Flights] Destination Weather',
                url: '/app/visualize#/edit/293b5a30-4c8f-11e8-b3d7-01146121b73d',
              },
            },
          }),
          retry,
        });
      });

      it('propagates context for Vertical bar visualization', async () => {
        await assertLogContains({
          description: 'execution context propagates to Elasticsearch via "x-opaque-id" header',
          predicate: checkHttpRequestId(
            'dashboard:dashboards:7adfa750-4c81-11e8-b3d7-01146121b73d;agg_based:histogram:9886b410-4c8b-11e8-b3d7-01146121b73d'
          ),
          retry,
        });

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
                type: 'agg_based',
                name: 'histogram',
                id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
                description: '[Flights] Delay Buckets',
                url: '/app/visualize#/edit/9886b410-4c8b-11e8-b3d7-01146121b73d',
              },
            },
          }),
          retry,
        });
      });
    });
  });
}
