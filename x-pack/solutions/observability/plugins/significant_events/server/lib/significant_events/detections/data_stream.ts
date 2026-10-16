/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/core-data-streams-server';
import type { Detection } from '@kbn/significant-events-schema';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

export const DETECTIONS_DATA_STREAM = '.significant_events-detections';

export const detectionsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date({ format: 'strict_date_optional_time' }),
    detection_id: mappings.keyword(),
    rule_uuid: mappings.keyword(),
    rule_name: mappings.keyword(),
    change_point_type: mappings.keyword(),
    p_value: { type: 'double' as const },
    severity_score: mappings.integer(),
    processed_by: mappings.keyword(),
  },
} satisfies MappingsDefinition;

/** Why the classifier skipped a detection; stored on the processed marker. */
export interface DetectionSkip {
  reason: string;
  probe_status?: string;
  baseline?: {
    decision: string;
    value: number;
    samples: number;
    median?: number;
    threshold?: number;
  };
}

/** `_source`-only fields the Detection and Discovery workflows also persist (mappings are `dynamic: false`). */
interface UnmappedDetectionFields {
  source_id?: string;
  alert_index?: string;
  workflow_execution_id?: string;
  scanned_by?: string;
  skip?: DetectionSkip;
}

export type StoredDetection = GetFieldsOf<typeof detectionsMappings> & UnmappedDetectionFields;
export type { Detection };

export const detectionsDataStream: DataStreamDefinition<
  typeof detectionsMappings,
  StoredDetection
> = {
  name: DETECTIONS_DATA_STREAM,
  version: 8,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: detectionsMappings,
  },
};
