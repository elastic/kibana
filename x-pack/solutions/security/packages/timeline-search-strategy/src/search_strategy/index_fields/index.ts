/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { FieldSpec } from '@kbn/data-plugin/common';

import type { Maybe } from '@kbn/securitysolution-timeline-common';

export type BeatFieldsFactoryQueryType = 'beatFields';

export interface FieldInfo {
  category: string;
  description?: string;
  example?: string | number;
  format?: string;
  name: string;
  type?: string;
}

export interface IndexField extends Omit<FieldSpec, 'format'> {
  /** Where the field belong */
  category: string;
  /** Example of field's value */
  example?: Maybe<string | number>;
  /** whether the field's belong to an alias index */
  indexes: Array<Maybe<string>>;
  /** Description of the field */
  description?: Maybe<string>;
  format?: Maybe<string>;
}

/**
 * @deprecated use EcsFlat from @kbn/ecs or kibana data views api
 */
export type BeatFields = Record<string, FieldInfo>;

export interface IndexFieldsStrategyRequestByIndices extends IEsSearchRequest {
  indices: string[];
  onlyCheckIfIndicesExist: boolean;
  includeUnmapped?: boolean;
}
export interface IndexFieldsStrategyRequestById extends IEsSearchRequest {
  dataViewId: string;
  onlyCheckIfIndicesExist: boolean;
}

/**
 * @deprecated use kibana data views api https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/data_views/common/data_views/data_views.ts#L139
 */
export type IndexFieldsStrategyRequest<T extends 'indices' | 'dataView'> = T extends 'dataView'
  ? IndexFieldsStrategyRequestById
  : IndexFieldsStrategyRequestByIndices;

/**
 * @deprecated use kibana data views api https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/data_views/common/data_views/data_views.ts#L139
 */
export interface IndexFieldsStrategyResponse extends IEsSearchResponse {
  indexFields: IndexField[];
  indicesExist: string[];
  runtimeMappings: MappingRuntimeFields;
}
