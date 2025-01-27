/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { buildAssetIdFilter } from './build';

describe('buildAssetIdFilter', function () {
  it('should build a host id filter', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue({
      name: 'host.id',
    });
    const result = buildAssetIdFilter('host1', 'host', dataView);
    expect(result[0]).toMatchObject({ query: { match_phrase: { 'host.id': 'host1' } } });
  });

  it('should build a pod id filter', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue({
      name: 'kubernetes.pod.uid',
    });
    const result = buildAssetIdFilter('pod1', 'pod', dataView);
    expect(result[0]).toMatchObject({ query: { match_phrase: { 'kubernetes.pod.uid': 'pod1' } } });
  });

  it('should return an empty array if the field id is not found', () => {
    dataView.getFieldByName = jest.fn().mockReturnValue(undefined);
    const result = buildAssetIdFilter('host1', 'host', dataView);
    expect(result).toStrictEqual([]);
  });
});
