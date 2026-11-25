/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getManagedWorkflowDefinition,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { detectionsMappings } from './data_stream';

describe('detectionsMappings', () => {
  // The mappings are `dynamic: false`, so an `exists` filter on an unmapped field never matches.
  it('maps every field the Detection workflow filters on with exists', () => {
    const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID);
    const yaml = definition && 'yaml' in definition ? String(definition.yaml) : '';
    const fields = [...yaml.matchAll(/exists:\s+field:\s+(\S+)/g)].map(([, field]) => field);

    expect(fields).toContain('observed_change_point_type');
    expect(fields.filter((field) => !(field in detectionsMappings.properties))).toEqual([]);
  });
});
