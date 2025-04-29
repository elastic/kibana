/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isEmpty } from 'lodash/fp';
import type { RuleFilterArray } from '../../../../../common/api/detection_engine/model/rule_schema';
import { buildTimeRangeFilter } from '../utils/build_events_query';
import { getQueryFilter } from '../utils/get_query_filter';
import type { SecuritySharedParams } from '../types';
import type { EqlRuleParams } from '../../rule_schema';

interface BuildEqlSearchRequestParams {
  sharedParams: SecuritySharedParams<EqlRuleParams>;
  query: string;
  from: string;
  to: string;
  size: number;
  filters: RuleFilterArray | undefined;
  eventCategoryOverride?: string;
  timestampField?: string;
  tiebreakerField?: string;
}

export const buildEqlSearchRequest = ({
  sharedParams,
  query,
  from,
  to,
  size,
  filters,
  eventCategoryOverride,
  timestampField,
  tiebreakerField,
}: BuildEqlSearchRequestParams): estypes.EqlSearchRequest => {
  const {
    inputIndex: index,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
    runtimeMappings,
  } = sharedParams;
  const timestamps = secondaryTimestamp
    ? [primaryTimestamp, secondaryTimestamp]
    : [primaryTimestamp];
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const esFilter = getQueryFilter({
    query: '',
    language: 'eql',
    filters: filters || [],
    index,
    exceptionFilter,
  });

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });
  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter, esFilter];
  const fields = [
    {
      field: '*',
      include_unmapped: true,
    },
    ...docFields,
  ];
  return {
    index,
    allow_no_indices: true,
    size,
    query,
    filter: {
      bool: {
        filter: requestFilter,
      },
    },
    // the allow_partial_search_results query parameter will supersede
    // the corresponding xpack settings on cluster
    // issue: https://github.com/elastic/kibana/issues/208760
    allow_partial_search_results: true,
    runtime_mappings: runtimeMappings,
    timestamp_field: timestampField,
    event_category_field: eventCategoryOverride,
    ...(!isEmpty(tiebreakerField)
      ? {
          tiebreaker_field: tiebreakerField,
        }
      : {}),
    fields,
  };
};
