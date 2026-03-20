/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  registerPipelineTaskType,
  getTaskIdForSpace,
  PIPELINE_TASK_TYPE,
  PIPELINE_TASK_ID_PREFIX,
} from './pipeline_task';
export type { PipelineTaskState } from './pipeline_task';
