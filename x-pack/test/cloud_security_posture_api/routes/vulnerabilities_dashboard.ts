/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';
import { vulnerabilitiesLatestMock } from './mocks/vulnerabilities_latest_mock';

const VULNERABILITIES_LATEST_INDEX = 'logs-cloud_security_posture.vulnerabilities_latest-default';
const BENCHMARK_SCORES_INDEX = 'logs-cloud_security_posture.scores-default';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    remove: () =>
      es.deleteByQuery({
        index: VULNERABILITIES_LATEST_INDEX,
        query: { match_all: {} },
        refresh: true,
      }),

    removeScores: () =>
      es.deleteByQuery({
        index: BENCHMARK_SCORES_INDEX,
        query: { match_all: {} },
        refresh: true,
      }),

    add: async <T>(vulnerabilitiesMock: T[]) => {
      await Promise.all(
        vulnerabilitiesMock.map((vulnerabilityDoc) =>
          es.index({
            index: VULNERABILITIES_LATEST_INDEX,
            body: vulnerabilityDoc,
          })
        )
      );
    },
  };

  describe('Vulnerability Dashboard API', async () => {
    before(async () => {
      await waitForPluginInitialized();
      await index.add(vulnerabilitiesLatestMock);
    });

    afterEach(async () => {
      await index.remove();
      await index.removeScores();
    });

    it('API responds with a 200 status code and matching data mock', async () => {
      const { body } = await supertest
        .get(`/internal/cloud_security_posture/vulnerabilities_dashboard`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      // TODO: make a function to remove real time calculated fields from 'body' like '@timestamp'

      console.log('JSON.stringify(body, null, 2)');
      console.log(JSON.stringify(body, null, 2));
      console.log('JSON.stringify(body, null, 2)');

      expect(body).to.eql({
        cnvmStatistics: {
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          resourcesScanned: 2,
          cloudRegions: 1,
        },
        vulnTrends: [
          {
            high: 1,
            policy_template: 'vuln_mgmt',
            // '@timestamp': /[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.[\d]{6}Z/,
            critical: 0,
            low: 0,
            vulnerabilities_stats_by_cloud_account: {
              '704479110758': {
                cloudAccountName: 'elastic-security-cloud-security-dev',
                high: 1,
                critical: 0,
                low: 0,
                cloudAccountId: '704479110758',
                medium: 1,
              },
            },
            medium: 1,
          },
        ],
        topVulnerableResources: [
          {
            resource: {
              id: '02d62a7df23951b19',
              name: 'name-ng-1-Node',
            },
            vulnerabilityCount: 1,
            cloudRegion: 'eu-west-1',
          },
          {
            resource: {
              id: '09d11277683ea41c5',
              name: 'othername-june12-8-8-0-1',
            },
            vulnerabilityCount: 1,
            cloudRegion: 'eu-west-1',
          },
        ],
        topPatchableVulnerabilities: [
          {
            cve: 'CVE-2015-8390',
            cvss: {
              score: 9.800000190734863,
              version: '3.1',
            },
            packageFixVersion: '2.56.1-9.amzn2.0.6',
            vulnerabilityCount: 1,
          },
          {
            cve: 'CVE-2015-8394',
            cvss: {
              score: 9.800000190734863,
              version: '3.1',
            },
            packageFixVersion: '2.56.1-9.amzn2.0.6',
            vulnerabilityCount: 1,
          },
        ],
        topVulnerabilities: [
          {
            cve: 'CVE-2015-8390',
            packageFixVersion: '2.56.1-9.amzn2.0.6',
            packageName: 'glib2',
            packageVersion: '2.56.1-9.amzn2.0.5',
            severity: 'MEDIUM',
            vulnerabilityCount: 1,
            cvss: {
              score: 9.800000190734863,
              version: '3.1',
            },
          },
          {
            cve: 'CVE-2015-8394',
            packageFixVersion: '2.56.1-9.amzn2.0.6',
            packageName: 'glib2',
            packageVersion: '2.56.1-9.amzn2.0.5',
            severity: 'HIGH',
            vulnerabilityCount: 1,
            cvss: {
              score: 9.800000190734863,
              version: '3.1',
            },
          },
        ],
      });
    });
  });
}
