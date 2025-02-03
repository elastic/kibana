/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TransformDestination,
  TransformPivot,
  TransformPutTransformRequest,
  TransformSource,
  TransformTimeSync,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SLO_RESOURCES_VERSION } from '../../../common/constants';
import { SLODefinition } from '../../domain/models';

export interface TransformSettings {
  frequency: TransformPutTransformRequest['frequency'];
  sync_field: TransformTimeSync['field'];
  sync_delay: TransformTimeSync['delay'];
}

export const getSLOTransformTemplate = (
  transformId: string,
  description: string,
  source: TransformSource,
  destination: TransformDestination,
  groupBy: TransformPivot['group_by'] = {},
  aggregations: TransformPivot['aggregations'] = {},
  settings: TransformSettings,
  slo: SLODefinition
): TransformPutTransformRequest => {
  const formattedSource = buildSourceWithFilters(source, slo);
  return {
    transform_id: transformId,
    description,
    source: formattedSource,
    frequency: settings.frequency,
    dest: destination,
    settings: {
      deduce_mappings: false,
      unattended: true,
    },
    sync: {
      time: {
        field: settings.sync_field,
        delay: settings.sync_delay,
      },
    },
    pivot: {
      group_by: groupBy,
      aggregations,
    },
    defer_validation: true,
    _meta: {
      version: SLO_RESOURCES_VERSION,
      managed: true,
      managed_by: 'observability',
    },
  };
};

const buildGroupingFilters = (slo: SLODefinition): QueryDslQueryContainer[] => {
  // build exists filters for each groupBy field to make sure the field exists
  const groups = [slo.groupBy].flat().filter((group) => !!group && group !== ALL_VALUE);
  return groups.map((group) => ({ exists: { field: group } }));
};

const buildSourceWithFilters = (source: TransformSource, slo: SLODefinition): TransformSource => {
  const groupingFilters = buildGroupingFilters(slo);
  const sourceFilters = [source.query?.bool?.filter].flat() || [];
  return {
    ...source,
    query: {
      ...source.query,
      bool: {
        ...source.query?.bool,
        filter: [...sourceFilters, ...groupingFilters] as QueryDslQueryContainer[],
      },
    },
  };
};
