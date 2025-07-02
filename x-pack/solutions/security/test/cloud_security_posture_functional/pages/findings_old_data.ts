/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import {
  CDR_EXTENDED_VULN_RETENTION_POLICY,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-common';
import type { FtrProviderContext } from '../ftr_provider_context';
import { vulnerabilitiesLatestMock } from '../mocks/vulnerabilities_latest_mock';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
  const chance = new Chance();
  const convertTimeToMillisecond = (time: string): number => {
    const match = time.match(/^(\d+)(d|h)$/);
    if (!match) {
      throw new Error('Invalid time format. Use "Xd" for days or "Xh" for hours.');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    if (unit === 'd') {
      return value * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    } else if (unit === 'h') {
      return value * 60 * 60 * 1000; // Convert hours to milliseconds
    }

    throw new Error('Unsupported time unit. Use "d" for days or "h" for hours.');
  };

  const dataOldKspm = [
    {
      '@timestamp': (
        Date.now() -
        convertTimeToMillisecond(LATEST_FINDINGS_RETENTION_POLICY) -
        convertTimeToMillisecond('1d')
      ).toString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
    },
  ];
  const dataWithinRetentionKspm = [
    {
      '@timestamp': (
        Date.now() -
        convertTimeToMillisecond(LATEST_FINDINGS_RETENTION_POLICY) +
        convertTimeToMillisecond('1d')
      ).toString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
    },
  ];

  const dataOldCspm = [
    {
      '@timestamp': (
        Date.now() -
        convertTimeToMillisecond(LATEST_FINDINGS_RETENTION_POLICY) -
        convertTimeToMillisecond('1d')
      ).toString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_aws',
          posture_type: 'cspm',
          name: 'CIS AWS V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
    },
  ];
  const dataWithinRetentionCspm = [
    {
      '@timestamp': (
        Date.now() -
        convertTimeToMillisecond(LATEST_FINDINGS_RETENTION_POLICY) +
        convertTimeToMillisecond('1d')
      ).toString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_aws',
          posture_type: 'cspm',
          name: 'CIS AWS V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
    },
  ];

  const dataOldCnvm = [
    {
      ...vulnerabilitiesLatestMock[0],
      '@timestamp': (
        Date.now() -
        convertTimeToMillisecond(CDR_EXTENDED_VULN_RETENTION_POLICY) -
        convertTimeToMillisecond('1d')
      ).toString(),
    },
  ];
  const dataWithinRetentionCnvm = [
    {
      ...vulnerabilitiesLatestMock[0],
      '@timestamp': (
        Date.now() -
        convertTimeToMillisecond(CDR_EXTENDED_VULN_RETENTION_POLICY) +
        convertTimeToMillisecond('1d')
      ).toString(),
    },
  ];

  describe('Old Data', function () {
    this.tags(['cloud_security_posture_findings']);
    let findings: typeof pageObjects.findings;
    let latestFindingsTable: typeof findings.latestFindingsTable;
    let latestVulnerabilitiesTable: typeof findings.latestVulnerabilitiesTable;

    before(async () => {
      findings = pageObjects.findings;
      latestFindingsTable = findings.latestFindingsTable;
      latestVulnerabilitiesTable = findings.latestVulnerabilitiesTable;

      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await findings.waitForPluginInitialized();

      // delete old data
      await findings.index.remove();
      await findings.vulnerabilitiesIndex.remove();
    });

    afterEach(async () => {
      await findings.index.remove();
      await findings.vulnerabilitiesIndex.remove();
    });

    describe('Findings page with old data', () => {
      it('returns no Findings KSPM', async () => {
        await findings.index.add(dataOldKspm);

        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
      it('returns no Findings CSPM', async () => {
        await findings.index.add(dataOldCspm);

        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
      it('returns no Findings CNVM', async () => {
        await findings.vulnerabilitiesIndex.add(dataOldCnvm);

        await findings.navigateToLatestVulnerabilitiesPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
      it('returns data grid with only data within retention KSPM', async () => {
        await findings.index.add([...dataOldKspm, ...dataWithinRetentionKspm]);

        await findings.navigateToLatestFindingsPage();
        await retry.waitFor(
          'Findings table to be loaded',
          async () => (await latestFindingsTable.getRowsCount()) === dataWithinRetentionKspm.length
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
      it('returns data grid with only data within retention CSPM', async () => {
        await findings.index.add([...dataOldCspm, ...dataWithinRetentionCspm]);

        await findings.navigateToLatestFindingsPage();
        await retry.waitFor(
          'Findings table to be loaded',
          async () => (await latestFindingsTable.getRowsCount()) === dataWithinRetentionCspm.length
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
      it('returns data grid with only data within retention CSPM', async () => {
        await findings.vulnerabilitiesIndex.add([...dataOldCnvm, ...dataWithinRetentionCnvm]);

        await findings.navigateToLatestVulnerabilitiesPage();
        await retry.waitFor(
          'Findings table to be loaded',
          async () =>
            (await latestVulnerabilitiesTable.getRowsCount()) === dataWithinRetentionCnvm.length
        );
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
    });
  });
}
