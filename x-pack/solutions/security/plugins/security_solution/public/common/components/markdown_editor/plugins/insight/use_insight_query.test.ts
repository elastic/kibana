/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';
import type { QueryOperator } from '@kbn/timelines-plugin/common';
import { DataProviderTypeEnum } from '../../../../../../common/api/timeline';
import { useInsightQuery } from './use_insight_query';
import { TestProviders } from '../../../../mock';
import { IS_OPERATOR } from '../../../../../timelines/components/timeline/data_providers/data_provider';

const mockProvider = {
  and: [],
  enabled: true,
  id: 'made-up-id',
  name: 'test',
  excluded: false,
  kqlQuery: '',
  type: DataProviderTypeEnum.default,
  queryMatch: {
    field: 'event.id',
    value: '*',
    operator: IS_OPERATOR as QueryOperator,
  },
};

describe('useInsightQuery', () => {
  it('should return renderable defaults', () => {
    const { result } = renderHook(
      () =>
        useInsightQuery({
          dataProviders: [mockProvider],
          filters: [],
          relativeTimerange: null,
        }),
      {
        wrapper: TestProviders,
      }
    );
    const { isQueryLoading, totalCount, oldestTimestamp } = result.current;
    expect(isQueryLoading).toBeFalsy();
    expect(totalCount).toBe(-1);
    expect(oldestTimestamp).toBe(undefined);
  });
});
