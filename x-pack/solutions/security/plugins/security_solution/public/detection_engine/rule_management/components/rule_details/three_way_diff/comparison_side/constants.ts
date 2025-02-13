/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';

export const FIELDS_WITH_SUBFIELDS: Array<keyof DiffableAllFields> = [
  'data_source',
  'kql_query',
  'eql_query',
  'esql_query',
  'threat_query',
  'rule_schedule',
  'rule_name_override',
  'timestamp_override',
  'timeline_template',
  'building_block',
  'threshold',
];
