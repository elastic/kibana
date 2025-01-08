/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionAlert800 } from './8.0.0';

import type { DetectionAlert840 } from './8.4.0';
import type { DetectionAlert860 } from './8.6.0';
import type { DetectionAlert870 } from './8.7.0';
import type { DetectionAlert880 } from './8.8.0';
import type { DetectionAlert890 } from './8.9.0';
import type { DetectionAlert8120 } from './8.12.0';
import type { DetectionAlert8130 } from './8.13.0';

import type {
  Ancestor8160,
  BaseFields8160,
  DetectionAlert8160,
  EqlBuildingBlockFields8160,
  EqlShellFields8160,
  NewTermsFields8160,
  WrappedFields8160,
} from './8.16.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880
  | DetectionAlert890
  | DetectionAlert8120
  | DetectionAlert8130
  | DetectionAlert8160;

export type {
  Ancestor8160 as AncestorLatest,
  BaseFields8160 as BaseFieldsLatest,
  DetectionAlert8160 as DetectionAlertLatest,
  WrappedFields8160 as WrappedFieldsLatest,
  EqlBuildingBlockFields8160 as EqlBuildingBlockFieldsLatest,
  EqlShellFields8160 as EqlShellFieldsLatest,
  NewTermsFields8160 as NewTermsFieldsLatest,
};
