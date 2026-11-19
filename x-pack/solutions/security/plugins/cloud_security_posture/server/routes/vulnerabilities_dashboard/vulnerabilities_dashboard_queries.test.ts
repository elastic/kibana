/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  CDR_LATEST_NATIVE_SCANNER_VULNERABILITIES_INDEX_PATTERN,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import { BENCHMARK_SCORE_INDEX_DEFAULT_NS } from '../../../common/constants';
import { getVulnerabilitiesStatistics } from './get_vulnerabilities_statistics';
import { getTopVulnerabilities } from './get_top_vulnerabilities';
import { getTopPatchableVulnerabilities } from './get_top_patchable_vulnerabilities';
import { getTopVulnerableResources } from './get_top_vulnerable_resources';
import { getVulnerabilitiesTrends } from './get_vulnerabilities_trend';

const emptySearchResponse = {
  took: 0,
  timed_out: false,
  _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
};

describe('vulnerabilities dashboard queries', () => {
  const cases = [
    ['getVulnerabilitiesStatistics', getVulnerabilitiesStatistics],
    ['getTopVulnerabilities', getTopVulnerabilities],
    ['getTopPatchableVulnerabilities', getTopPatchableVulnerabilities],
    ['getTopVulnerableResources', getTopVulnerableResources],
  ] as const;

  it.each(cases)(
    '%s searches CNVM and the native scanner alias only, and tolerates a missing index',
    async (_name, run) => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(emptySearchResponse);

      await run(esClient);

      const [request] = esClient.search.mock.calls[0];
      expect(request?.index).toBe(
        `${CDR_LATEST_NATIVE_SCANNER_VULNERABILITIES_INDEX_PATTERN},${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}`
      );
      expect(request?.index).not.toContain('security_solution-*');
      expect(request?.index).not.toContain('security_solution-wiz.vulnerability_latest');
      expect(request?.ignore_unavailable).toBe(true);
      expect(request?.allow_no_indices).toBe(true);
    }
  );

  it('getVulnerabilitiesTrends tolerates a missing score index', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(emptySearchResponse);

    await expect(getVulnerabilitiesTrends(esClient)).resolves.toEqual([]);

    const [request] = esClient.search.mock.calls[0];
    expect(request?.index).toBe(BENCHMARK_SCORE_INDEX_DEFAULT_NS);
    expect(request?.ignore_unavailable).toBe(true);
    expect(request?.allow_no_indices).toBe(true);
  });
});
