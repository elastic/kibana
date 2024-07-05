/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FunctionalFtrProviderContext } from '../../common/ftr_provider_context';
import { setupCSPPackage } from '../../common/utils/csp_package_helpers';
import { addIndexBulkDocs, deleteIndices } from '../../common/utils/index_api_helpers';
import { FINDINGS_INDEX, FINDINGS_LATEST_INDEX } from '../../common/utils/indices';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FunctionalFtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');
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
      await setupCSPPackage(retry, log, supertest);
    });

    after(async () => {
      await deleteIndices(es, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);
    });

    describe('Findings page with old data', () => {
      it('returns no Findings KSPM', async () => {
        // Prepare mocked findings
        await deleteIndices(es, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);
        await addIndexBulkDocs(es, dataOldKspm, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);

        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
      it('returns no Findings CSPM', async () => {
        // Prepare mocked findings
        await deleteIndices(es, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);
        await addIndexBulkDocs(es, dataOldCspm, [FINDINGS_INDEX, FINDINGS_LATEST_INDEX]);

        await findings.navigateToLatestFindingsPage();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await findings.isLatestFindingsTableThere()).to.be(false);
      });
    });
  });
}
