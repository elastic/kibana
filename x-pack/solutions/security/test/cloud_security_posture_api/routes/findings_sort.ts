/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS } from '@kbn/cloud-security-posture-common';
import {
  getSortField,
  FIELDS_REQUIRING_CASE_INSENSITIVE_SORT,
} from '@kbn/cloud-security-posture-plugin/common/utils/findings_sort';
import type { FtrProviderContext } from '../ftr_provider_context';
import { EsIndexDataProvider, waitForPluginInitialized } from '../utils';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const logger = getService('log');

  const findingsIndex = new EsIndexDataProvider(
    es,
    CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS
  );

  describe('Misconfigurations sort scripts', () => {
    const docWithAllFields = {
      resource: { id: 'res-1', name: 'kubelet', sub_type: 'process' },
      result: { evaluation: 'passed' },
      rule: {
        name: 'Test Rule',
        section: 'networking',
        benchmark: { id: 'cis_k8s', posture_type: 'kspm', name: 'CIS K8s', version: 'v1.0.0' },
      },
      data_stream: { dataset: 'cloud_security_posture.findings', namespace: 'default' },
    };

    const docMissingSortFields = {
      resource: { id: 'res-2' },
      result: { evaluation: 'failed' },
      rule: {
        name: 'Sparse Rule',
        benchmark: { id: 'cis_aws', posture_type: 'cspm', name: 'CIS AWS', version: 'v1.5.0' },
      },
      cloud: { account: { id: 'account-1' } },
      data_stream: { dataset: 'cloud_security_posture.findings', namespace: 'default' },
    };

    before(async () => {
      await waitForPluginInitialized({ retry, logger, supertest });
      await findingsIndex.deleteAll();
      await findingsIndex.addBulk([docWithAllFields, docMissingSortFields]);
    });

    after(async () => {
      await findingsIndex.deleteAll();
    });

    for (const field of FIELDS_REQUIRING_CASE_INSENSITIVE_SORT) {
      for (const direction of ['asc', 'desc'] as const) {
        it(`painless sort script compiles and executes for ${field} ${direction}`, async () => {
          const response = await es.search({
            index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
            size: 10,
            sort: [getSortField({ field, direction })],
          });

          expect(response.hits.hits.length).to.be(2);
        });
      }
    }

    it('places missing values last in ascending sort', async () => {
      const response = await es.search({
        index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
        size: 10,
        sort: [getSortField({ field: 'rule.section', direction: 'asc' })],
      });

      const hits = response.hits.hits;
      expect((hits[0]._source as any).resource.id).to.be('res-1');
      expect((hits[1]._source as any).resource.id).to.be('res-2');
    });

    it('places missing values last in descending sort', async () => {
      const response = await es.search({
        index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
        size: 10,
        sort: [getSortField({ field: 'rule.section', direction: 'desc' })],
      });

      const hits = response.hits.hits;
      expect((hits[0]._source as any).resource.id).to.be('res-1');
      expect((hits[1]._source as any).resource.id).to.be('res-2');
    });

    it('regular field sort with unmapped_type does not error', async () => {
      const response = await es.search({
        index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
        size: 10,
        sort: [getSortField({ field: 'some.unmapped.field', direction: 'asc' })],
      });

      expect(response.hits.hits.length).to.be(2);
    });
  });
}
