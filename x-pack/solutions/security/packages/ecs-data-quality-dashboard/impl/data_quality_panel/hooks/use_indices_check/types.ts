/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  PartitionedFieldMetadata,
  UnallowedValueCount,
  UnallowedValueSearchResult,
} from '../../types';
import type { MappingsError } from '../../utils/fetch_mappings';
import type { UnallowedValuesError } from '../../utils/fetch_unallowed_values';
import type { CheckIndexProps } from '../../utils/check_index';

export interface UseIndicesCheckCheckState {
  [indexName: string]: {
    isChecking: boolean;
    isLoadingMappings: boolean;
    isLoadingUnallowedValues: boolean;
    indexes: Record<string, IndicesGetMappingIndexMappingRecord> | null;
    partitionedFieldMetadata: PartitionedFieldMetadata | null;
    searchResults: UnallowedValueSearchResult[] | null;
    unallowedValues: Record<string, UnallowedValueCount[]> | null;
    mappingsProperties: Record<string, MappingProperty> | null;
    genericError: string | Error | null;
    mappingsError: MappingsError | null;
    unallowedValuesError: UnallowedValuesError | null;
    isCheckComplete: boolean;
  };
}

export interface UseIndicesCheckState {
  checkState: UseIndicesCheckCheckState;
}

export interface UseIndicesCheckReturnValue extends UseIndicesCheckState {
  checkIndex: (props: Omit<CheckIndexProps, 'onCheckCompleted'>) => void;
}
