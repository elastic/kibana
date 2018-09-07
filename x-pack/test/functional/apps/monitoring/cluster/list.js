/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterList = getService('monitoringClusterList');
  const clusterOverview = getService('monitoringClusterOverview');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['monitoring', 'header', 'common']);
  const config = getService('config');

  describe('Cluster listing', () => {
    const cloud = config.get('servers.elasticsearch.hostname').includes('found');
    // log.info('We\'re expecting Elastic Cloud behavior because we found "found" in the elasticsearch hostname');

    describe('with trial license clusters', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      const UNSUPPORTED_CLUSTER_UUID = '6d-9tDFTRe-qT5GoBytdlQ';

      before(async () => {
        await setup('monitoring/multicluster', {
          from: '2017-08-15 21:00:00',
          to: '2017-08-16 00:00:00',
        });

        await clusterList.assertDefaults();
      });

      after(async () => {
        await tearDown();
      });

      afterEach(async () => {
        await clusterList.clearFilter();
      });

      describe('cluster table and toolbar', () => {
        it('shows 3 clusters sorted by name', async () => {
          const rows = await clusterList.getRows();
          expect(rows.length).to.be(3);
        });

        it('filters for a single cluster', async () => {
          await clusterList.setFilter('clusterone');
          const rows = await clusterList.getRows();
          expect(rows.length).to.be(1);
        });

        it('filters for non-existent cluster', async () => {
          await clusterList.setFilter('foobar');
          await clusterList.assertNoData();
        });
      });

      describe('cluster row actions', () => {
        it('clicking the basic cluster shows a toast message', async () => {
          const basicClusterLink = await clusterList.getClusterLink(UNSUPPORTED_CLUSTER_UUID);
          await basicClusterLink.click();
          expect(await testSubjects.exists('monitoringLicenseWarning', 2000)).to.be(true);
        });

        /*
         * TODO: When the licenses of the Trial clusters expire, add license expiration tests
         * (Trial licenses expire 2017-09-14)
         */
      });
    });

    describe('with all basic license clusters', () => {
      const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

      const UNSUPPORTED_CLUSTER_UUID = 'kH7C358oRzK6bmNzTeLEug';
      const SUPPORTED_CLUSTER_UUID = 'NDKg6VXAT6-TaGzEK2Zy7g';

      before(async () => {
        await setup('monitoring/multi-basic', {
          from: '2017-09-07 20:12:04.011',
          to: '2017-09-07 20:18:55.733',
        });

        await clusterList.assertDefaults();
      });

      after(async () => {
        await tearDown();
      });

      describe('cluster row content', () => {
        it('non-primary basic cluster shows NA for everything', async () => {
          expect(await clusterList.getClusterName(UNSUPPORTED_CLUSTER_UUID)).to.be('staging');
          expect(await clusterList.getClusterStatus(UNSUPPORTED_CLUSTER_UUID)).to.be('-');
          expect(await clusterList.getClusterNodesCount(UNSUPPORTED_CLUSTER_UUID)).to.be('-');
          expect(await clusterList.getClusterIndicesCount(UNSUPPORTED_CLUSTER_UUID)).to.be('-');
          expect(await clusterList.getClusterDataSize(UNSUPPORTED_CLUSTER_UUID)).to.be('-');
          expect(await clusterList.getClusterLogstashCount(UNSUPPORTED_CLUSTER_UUID)).to.be('-');
          expect(await clusterList.getClusterKibanaCount(UNSUPPORTED_CLUSTER_UUID)).to.be('-');
          if (cloud) {
            // https://github.com/elastic/cloud/blob/master/scala-services/runner/src/main/resources/templates/allocator/kibana/config/kibana-6.yml#L80-L81
            expect(await clusterList.getClusterLicense(UNSUPPORTED_CLUSTER_UUID)).to.be('Basic');
          } else {
            expect(await clusterList.getClusterLicense(UNSUPPORTED_CLUSTER_UUID)).to.be('Basic\nExpires 29 Aug 30');
          }
        });

        it('primary basic cluster shows cluster metrics', async () => {
          expect(await clusterList.getClusterName(SUPPORTED_CLUSTER_UUID)).to.be('production');
          if (cloud) {
            // TODO: Figure out why all the rest shows "-" on Cloud
            expect(await clusterList.getClusterLicense(SUPPORTED_CLUSTER_UUID)).to.be('Basic');
          } else {
            expect(await clusterList.getClusterStatus(SUPPORTED_CLUSTER_UUID)).to.be('N/A');
            expect(await clusterList.getClusterNodesCount(SUPPORTED_CLUSTER_UUID)).to.be('2');
            expect(await clusterList.getClusterIndicesCount(SUPPORTED_CLUSTER_UUID)).to.be('4');
            expect(await clusterList.getClusterDataSize(SUPPORTED_CLUSTER_UUID)).to.be('1.6 MB');
            expect(await clusterList.getClusterLogstashCount(SUPPORTED_CLUSTER_UUID)).to.be('2');
            expect(await clusterList.getClusterKibanaCount(SUPPORTED_CLUSTER_UUID)).to.be('1');
            expect(await clusterList.getClusterLicense(SUPPORTED_CLUSTER_UUID)).to.be('Basic\nExpires 29 Aug 30');
          }
        });
      });

      describe('cluster row actions', () => {
        it('clicking the non-primary basic cluster shows a toast message', async () => {
          const basicClusterLink = await clusterList.getClusterLink(UNSUPPORTED_CLUSTER_UUID);
          await basicClusterLink.click();
          expect(await testSubjects.exists('monitoringLicenseWarning', 2000)).to.be(true);
        });

        it('clicking the primary basic cluster goes to overview @skipcloud', async () => {
          const primaryBasicClusterLink = await clusterList.getClusterLink(SUPPORTED_CLUSTER_UUID);
          await primaryBasicClusterLink.click();

          // TODO: Why next step fails on Cloud?  It gives the same monitoringLicenseWarning as above for both clusters
          // If we manually go to Monitoring page on Cloud and turn on Monitoring we start on the overview page.
          //  Error: retry.try timeout: Error: retry.try timeout: [POST http://localhost:9515/session/e8e821050605d5fcb2425903ddf96f0e/element / {"using":"css selector","value":"[data-test-subj~=\"clusterOverviewContainer\"]"}] no such elemen
          // t: Unable to locate element: {"method":"css selector","selector":"[data-test-subj~="clusterOverviewContainer"]"}
          expect(await clusterOverview.isOnClusterOverview()).to.be(true);
          expect(await clusterOverview.getClusterName()).to.be('production');

          await PageObjects.monitoring.clickBreadcrumb('breadcrumbClusters'); // reset for next test
        });

      });
    });
  });
}
