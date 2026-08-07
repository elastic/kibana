/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PREBUILT_WATCH_DARK_ID,
  PREBUILT_WATCH_DEEP_ID,
  PREBUILT_WATCH_FLOOR_ID,
  PREBUILT_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import WATCH_DARK_YAML from './watch_dark.yaml';
import WATCH_DEEP_YAML from './watch_deep.yaml';
import WATCH_FLOOR_YAML from './watch_floor.yaml';
import WATCH_OFFICER_YAML from './watch_officer.yaml';

export const PREBUILT_WATCH_DEFINITIONS = [
  { id: PREBUILT_WATCH_FLOOR_ID, yaml: WATCH_FLOOR_YAML },
  { id: PREBUILT_WATCH_OFFICER_ID, yaml: WATCH_OFFICER_YAML },
  { id: PREBUILT_WATCH_DARK_ID, yaml: WATCH_DARK_YAML },
  { id: PREBUILT_WATCH_DEEP_ID, yaml: WATCH_DEEP_YAML },
] as const;

export type PrebuiltWatchId = (typeof PREBUILT_WATCH_DEFINITIONS)[number]['id'];
