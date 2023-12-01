/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'findings', 'header']);
  const chance = new Chance();
  const hoursToMillisecond = (hours: number) => hours * 60 * 60 * 1000;

  const dataOldKspm = [
    {
      '@timestamp': (Date.now() - hoursToMillisecond(27)).toString(),
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
      '@timestamp': (Date.now() - hoursToMillisecond(27)).toString(),
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

  describe('Old Data', function () {
    this.tags(['cloud_security_posture_findings']);
    let findings: typeof pageObjects.findings;

    before(async () => {
      findings = pageObjects.findings;

      // Before we start any test we must wait for cloud_security_posture plugin to complete its initialization
      await findings.waitForPluginInitialized();
    });

    after(async () => {
      await findings.index.remove();
    });

    describe('Findings page with old data', () => {
      it('returns no Findings KSPM', async () => {
        // Prepare mocked findings
        await findings.index.remove();
        await findings.index.add(dataOldKspm);

        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
      it('returns no Findings CSPM', async () => {
        // Prepare mocked findings
        await findings.index.remove();
        await findings.index.add(dataOldCspm);

        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
    });
  });
}
