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
import type { DetectionAlert8160 } from './8.16.0';
import type { DetectionAlert8180 } from './8.18.0';

import type {
  Ancestor8190,
  BaseFields8190,
  DetectionAlert8190,
  EqlBuildingBlockFields8190,
  EqlShellFields8190,
  NewTermsFields8190,
  WrappedFields8190,
} from './8.19.0';

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
  | DetectionAlert8160
  | DetectionAlert8180
  | DetectionAlert8190;

export type {
  Ancestor8190 as AncestorLatest,
  BaseFields8190 as BaseFieldsLatest,
  DetectionAlert8190 as DetectionAlertLatest,
  WrappedFields8190 as WrappedFieldsLatest,
  EqlBuildingBlockFields8190 as EqlBuildingBlockFieldsLatest,
  EqlShellFields8190 as EqlShellFieldsLatest,
  NewTermsFields8190 as NewTermsFieldsLatest,
};
