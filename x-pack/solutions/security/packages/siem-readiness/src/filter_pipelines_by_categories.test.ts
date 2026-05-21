/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CategoriesResponse, PipelineStats } from './types';
import { filterPipelinesByCategories } from './filter_pipelines_by_categories';

const ENDPOINT_INDEX = '.ds-logs-endpoint.events-2024.01.01-000001';
const CLOUD_INDEX = '.ds-logs-cloud.asset-2024.01.01-000001';
const INTERNAL_INDEX = '.kibana_task_manager-8.0.0-000001';

const mockCategories: CategoriesResponse = {
  rawCategoriesMap: [],
  mainCategoriesMap: [
    { category: 'Endpoint', indices: [{ indexName: ENDPOINT_INDEX, docs: 1000 }] },
    { category: 'Cloud', indices: [{ indexName: CLOUD_INDEX, docs: 500 }] },
  ],
};

const makePipeline = (name: string, indices: string[]): PipelineStats => ({
  name,
  indices,
  docsCount: 100,
  failedDocsCount: 0,
  statsAvailable: true,
});

describe('filterPipelinesByCategories', () => {
  it('returns empty array when categoriesData is undefined', () => {
    expect(filterPipelinesByCategories([makePipeline('p1', [ENDPOINT_INDEX])], undefined)).toEqual(
      []
    );
  });

  it('returns empty array when mainCategoriesMap is empty', () => {
    const empty: CategoriesResponse = { rawCategoriesMap: [], mainCategoriesMap: [] };
    expect(filterPipelinesByCategories([makePipeline('p1', [ENDPOINT_INDEX])], empty)).toEqual([]);
  });

  it('filters out pipelines whose indices are not in any category', () => {
    const result = filterPipelinesByCategories(
      [makePipeline('internal', [INTERNAL_INDEX])],
      mockCategories
    );
    expect(result).toHaveLength(0);
  });

  it('keeps pipelines whose indices appear in the category map', () => {
    const result = filterPipelinesByCategories(
      [makePipeline('endpoint-pipeline', [ENDPOINT_INDEX])],
      mockCategories
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('endpoint-pipeline');
  });

  it('keeps a pipeline that serves indices across multiple categories', () => {
    const result = filterPipelinesByCategories(
      [makePipeline('shared-pipeline', [ENDPOINT_INDEX, CLOUD_INDEX])],
      mockCategories
    );
    expect(result).toHaveLength(1);
  });

  it('deduplicates: a pipeline is returned once even if it matches multiple categories', () => {
    const result = filterPipelinesByCategories(
      [makePipeline('shared-pipeline', [ENDPOINT_INDEX, CLOUD_INDEX])],
      mockCategories
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('shared-pipeline');
  });

  it('mixes categorized and uncategorized pipelines correctly', () => {
    const result = filterPipelinesByCategories(
      [
        makePipeline('endpoint-pipeline', [ENDPOINT_INDEX]),
        makePipeline('internal', [INTERNAL_INDEX]),
        makePipeline('cloud-pipeline', [CLOUD_INDEX]),
      ],
      mockCategories
    );
    expect(result.map((p) => p.name)).toEqual(['endpoint-pipeline', 'cloud-pipeline']);
  });
});
