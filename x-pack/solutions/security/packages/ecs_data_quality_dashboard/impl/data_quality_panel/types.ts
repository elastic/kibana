/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmExplainLifecycleLifecycleExplain,
  IndicesGetMappingIndexMappingRecord,
} from '@elastic/elasticsearch/lib/api/types';
import type { Direction } from '@elastic/eui';

export interface Mappings {
  pattern: string;
  indexes: Record<string, IndicesGetMappingIndexMappingRecord>;
}

export interface EcsFieldMetadata {
  dashed_name: string;
  description: string;
  flat_name: string;
  level: string;
  name: string;
  normalize: string[];
  short: string;
  type: string;

  allowed_values?: AllowedValue[];
  beta?: string;
  doc_values?: boolean;
  example?: string | number | boolean;
  expected_values?: string[];
  format?: string;
  ignore_above?: number;
  index?: boolean;
  input_format?: string;
  multi_fields?: MultiField[];
  object_type?: string;
  original_fieldset?: string;
  output_format?: string;
  output_precision?: number;
  pattern?: string;
  required?: boolean;
  scaling_factor?: number;
}

export interface AllowedValue {
  description: string;
  name: string;
  expected_event_types?: string[];
  beta?: string;
}

export interface MultiField {
  flat_name: string;
  name: string;
  type: string;
}

export interface CustomFieldMetadata {
  hasEcsMetadata: false;
  indexFieldName: string;
  indexFieldType: string;
  indexInvalidValues: [];
  isEcsCompliant: false;
  isInSameFamily: false;
}

export interface EcsBasedFieldMetadata extends EcsFieldMetadata {
  hasEcsMetadata: true;
  indexFieldName: string;
  indexFieldType: string;
  indexInvalidValues: UnallowedValueCount[];
  isEcsCompliant: boolean;
  isInSameFamily: boolean;
}

export interface IncompatibleFieldMetadata extends EcsBasedFieldMetadata {
  isInSameFamily: false;
  isEcsCompliant: false;
}

export interface SameFamilyFieldMetadata extends EcsBasedFieldMetadata {
  isEcsCompliant: false;
  isInSameFamily: true;
}

export interface EcsCompliantFieldMetadata extends EcsBasedFieldMetadata {
  isEcsCompliant: true;
  isInSameFamily: false;
}

export type EnrichedFieldMetadata =
  | EcsCompliantFieldMetadata
  | CustomFieldMetadata
  | IncompatibleFieldMetadata
  | SameFamilyFieldMetadata;

export interface PartitionedFieldMetadata {
  all: EnrichedFieldMetadata[];
  custom: CustomFieldMetadata[];
  ecsCompliant: EcsCompliantFieldMetadata[];
  incompatible: IncompatibleFieldMetadata[];
  sameFamily: SameFamilyFieldMetadata[];
}

export interface UnallowedValueRequestItem {
  allowedValues: string[];
  indexFieldName: string;
  indexName: string;
}

export interface Bucket {
  key: string;
  doc_count: number;
}

export interface UnallowedValueCount {
  fieldName: string;
  count: number;
}

export interface UnallowedValueSearchResult {
  aggregations?: {
    [x: string]: {
      buckets?: Bucket[];
    };
  };
}

export type IlmPhase = 'hot' | 'warm' | 'cold' | 'frozen' | 'unmanaged';

export interface IncompatibleFieldMappingItem {
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  description: string;
}

export interface ActualIncompatibleValue {
  name: string;
  count: number;
}

export interface IncompatibleFieldValueItem {
  fieldName: string;
  expectedValues: string[];
  actualValues: ActualIncompatibleValue[];
  description: string;
}

export interface SameFamilyFieldItem {
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  description: string;
}

export interface IlmExplainPhaseCounts {
  hot: number;
  warm: number;
  cold: number;
  frozen: number;
  unmanaged: number;
}

export interface DataQualityCheckResult {
  docsCount: number | undefined;
  error: string | null;
  ilmPhase: IlmPhase | undefined;
  incompatible: number | undefined;
  indexName: string;
  markdownComments: string[];
  sameFamily: number | undefined;
  pattern: string;
  checkedAt: number | undefined;
}

export interface PatternRollup {
  docsCount: number | undefined;
  error: string | null;
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  ilmExplainPhaseCounts: IlmExplainPhaseCounts | undefined;
  indices: number | undefined;
  pattern: string;
  results: Record<string, DataQualityCheckResult> | undefined;
  sizeInBytes: number | undefined;
  stats: Record<string, MeteringStatsIndex> | null;
}

export interface CheckIndexRequest {
  pattern: string;
  indexName: string;
}

export interface RequestQueueRequest<T> {
  topicId: string;
  request: T;
}

export interface RequestQueueResponse<T, U> {
  topicId: string;
  request: T;
  response: U;
}

export interface IndexToCheck {
  pattern: string;
  indexName: string;
}

export type OnCheckCompleted = (param: {
  batchId: string;
  isCheckAll: boolean;
  isLastCheck: boolean;
  checkAllStartTime: number;
  error: string | null;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata | null;
  pattern: string;
  requestTime?: number;
}) => void;

export interface ErrorSummary {
  error: string;
  indexName: string | null;
  pattern: string;
}

export interface SortConfig {
  sort: {
    direction: Direction;
    field: string;
  };
}

export interface SelectedIndex {
  indexName: string;
  pattern: string;
}

export interface MeteringStatsIndex {
  uuid?: string;
  name: string;
  num_docs: number | null;
  size_in_bytes: number | null;
  data_stream?: string;
}

export interface MeteringIndicesStatsResponse {
  _shards: {
    total: number;
    successful: number;
    failed: number;
  };
  indices: MeteringStatsIndex[];
  datastreams: Array<{ name: string; num_docs: number; size_in_bytes: number }>;
  total: {
    num_docs: number;
    size_in_bytes: number;
  };
}

export type DataQualityIndexCheckedParams = DataQualityCheckAllCompletedParams & {
  errorCount?: number;
  ilmPhase?: string;
  indexId?: string | null;
  indexName: string;
  sameFamilyFields?: string[];
  unallowedMappingFields?: string[];
  unallowedValueFields?: string[];
};

export interface DataQualityCheckAllCompletedParams {
  batchId: string;
  ecsVersion: string;
  isCheckAll: boolean;
  numberOfDocuments?: number;
  numberOfIncompatibleFields?: number;
  numberOfIndices?: number;
  numberOfIndicesChecked?: number;
  numberOfSameFamily?: number;
  sizeInBytes?: number;
  timeConsumedMs?: number;
}

export type ReportDataQualityIndexChecked = (params: DataQualityIndexCheckedParams) => void;
export type ReportDataQualityCheckAllCompleted = (
  params: DataQualityCheckAllCompletedParams
) => void;

export interface TelemetryEvents {
  reportDataQualityIndexChecked?: ReportDataQualityIndexChecked;
  reportDataQualityCheckAllCompleted?: ReportDataQualityCheckAllCompleted;
}

export interface IndexSummaryTableItem {
  docsCount: number;
  incompatible: number | undefined;
  indexName: string;
  ilmPhase: IlmPhase | undefined;
  pattern: string;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
  checkedAt: number | undefined;
}

export interface StorageResultBase {
  batchId: string;
  indexName: string;
  indexPattern: string;
  isCheckAll: boolean;
  checkedAt: number;
  docsCount: number;
  totalFieldCount: number;
  ecsFieldCount: number;
  customFieldCount: number;
  incompatibleFieldCount: number;
  sameFamilyFieldCount: number;
  sameFamilyFields: string[];
  unallowedMappingFields: string[];
  unallowedValueFields: string[];
  sizeInBytes: number;
  ilmPhase?: IlmPhase;
  markdownComments: string[];
  ecsVersion: string;
  indexId: string;
  error: string | null;
}

export interface StorageResult extends StorageResultBase {
  incompatibleFieldMappingItems: IncompatibleFieldMappingItem[];
  incompatibleFieldValueItems: IncompatibleFieldValueItem[];
  sameFamilyFieldItems: SameFamilyFieldItem[];
}

export interface HistoricalResultBase {
  '@timestamp': number;
  checkedBy: string;
}

export interface LegacyHistoricalResult extends StorageResultBase, HistoricalResultBase {}

export interface NonLegacyHistoricalResult extends StorageResult, HistoricalResultBase {}

export type HistoricalResult = LegacyHistoricalResult | NonLegacyHistoricalResult;
