/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { EcsEvent } from '@elastic/ecs';
import type { FtrProviderContext } from '../ftr_provider_context';
import {
  vulnerabilitiesLatestMock,
  scoresVulnerabilitiesMock,
} from './mocks/vulnerabilities_latest_mock';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';
import { EsIndexDataProvider, waitForPluginInitialized } from '../utils';

export interface CnvmStatistics {
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  resourcesScanned?: number;
  cloudAccounts?: number;
}

export interface AccountVulnStats {
  cloudAccountId: string;
  cloudAccountName: string;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export interface VulnStatsTrend {
  '@timestamp': string;
  policy_template: 'vuln_mgmt';
  critical: number;
  high: number;
  medium: number;
  low: number;
  vulnerabilities_stats_by_cloud_account?: Record<
    AccountVulnStats['cloudAccountId'],
    AccountVulnStats
  >;
  event: EcsEvent;
}

export interface VulnerableResourceStat {
  vulnerabilityCount?: number;
  resource: {
    id?: string;
    name?: string;
  };
  cloudRegion?: string;
}

export interface PatchableVulnerabilityStat {
  vulnerabilityCount?: number;
  packageFixVersion?: string;
  cve?: string;
  cvss: {
    score?: number;
    version?: string;
  };
}

export interface VulnerabilityStat {
  packageFixVersion?: string;
  packageName?: string;
  packageVersion?: string;
  severity?: string;
  vulnerabilityCount?: number;
  cvss: {
    score?: number;
    version?: string;
  };
}

export interface CnvmDashboardData {
  cnvmStatistics: CnvmStatistics;
  vulnTrends: VulnStatsTrend[];
  topVulnerableResources: VulnerableResourceStat[];
  topPatchableVulnerabilities: PatchableVulnerabilityStat[];
  topVulnerabilities: VulnerabilityStat[];
}

const VULNERABILITIES_LATEST_INDEX = 'logs-cloud_security_posture.vulnerabilities_latest-default';
const BENCHMARK_SCORES_INDEX = 'logs-cloud_security_posture.scores-default';

type CnvmDashboardDataWithoutTimestamp = Omit<CnvmDashboardData, 'vulnTrends'> & {
  vulnTrends: Array<Omit<VulnStatsTrend, '@timestamp' | 'event'>>;
};

const removeRealtimeCalculatedFields = (
  responseBody: CnvmDashboardData
): CnvmDashboardDataWithoutTimestamp => {
  const cleanedVulnTrends = responseBody.vulnTrends.map((trend) => {
    const { ['@timestamp']: timestamp, event, ...rest } = trend;
    return rest;
  });

  return {
    ...responseBody,
    vulnTrends: cleanedVulnTrends,
  };
};

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const logger = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);
  const vulnerabilitiesIndex = new EsIndexDataProvider(es, VULNERABILITIES_LATEST_INDEX);
  const scoresIndex = new EsIndexDataProvider(es, BENCHMARK_SCORES_INDEX);

  describe.skip('Vulnerability Dashboard API', async () => {
    beforeEach(async () => {
      await vulnerabilitiesIndex.deleteAll();
      await scoresIndex.deleteAll();
      await waitForPluginInitialized({ retry, logger, supertest });
      await scoresIndex.addBulk(scoresVulnerabilitiesMock, false);
      await vulnerabilitiesIndex.addBulk(vulnerabilitiesLatestMock, false);
    });

    afterEach(async () => {
      await vulnerabilitiesIndex.deleteAll();
      await scoresIndex.deleteAll();
    });

    it('responds with a 200 status code and matching data mock', async () => {
      const { body } = await supertest
        .get(`/internal/cloud_security_posture/vulnerabilities_dashboard`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);

      // @timestamp and event are real time calculated fields, we need to remove them in order to remove inconsistencies between mock and actual result
      const cleanedBody = removeRealtimeCalculatedFields(body);

      expect(cleanedBody).to.eql({
        cnvmStatistics: {
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          resourcesScanned: 2,
          cloudAccounts: 1,
        },
        vulnTrends: [
          {
            high: 1,
            policy_template: 'vuln_mgmt',
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

    it('returns a 400 error when necessary indices are nonexistent', async () => {
      await vulnerabilitiesIndex.destroyIndex();

      await supertest
        .get('/internal/cloud_security_posture/vulnerabilities_dashboard')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(500);
    });

    it('GET vulnerabilities dashboard API with users with read access to cloud security posture', async () => {
      const { status } = await supertestWithoutAuth
        .get('/internal/cloud_security_posture/vulnerabilities_dashboard')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
        .auth('role_security_read_user', cspSecurity.getPasswordForUser('role_security_read_user'));

      expect(status).to.be(200);
    });

    it('GET vulnerabilities dashboard API with users without read access to cloud security posture', async () => {
      const { status } = await supertestWithoutAuth
        .get('/internal/cloud_security_posture/vulnerabilities_dashboard')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
        .auth(
          'role_security_no_read_user',
          cspSecurity.getPasswordForUser('role_security_no_read_user')
        );

      expect(status).to.be(403);
    });
  });
}
