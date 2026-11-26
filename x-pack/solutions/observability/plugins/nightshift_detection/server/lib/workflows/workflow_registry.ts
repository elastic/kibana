/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import {
  NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID,
  NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW_ID,
} from '@kbn/workflows/managed';

/**
 * The managed workflows a space gets when it is set up, in install order. Each is defined in
 * `@kbn/workflows/managed` with `defineBoundWorkflow`, so it is installed once per space and runs as
 * the space's detection service account. `WorkflowInstaller` installs, checks and turns on every
 * id listed here; to add a workflow, define it there and list its id here.
 */
export const DETECTION_WORKFLOW_IDS: readonly ManagedWorkflowId[] = [
  NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID,
  NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW_ID,
];
