/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionTreePromptTools } from '@kbn/nightshift-decision-trees';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../sandbox_bash/write_file_tool';
import {
  RECORD_REMEDIATION_TOOL_ID,
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
} from './learning_tools';
import { DECISION_TREE_SUBMIT_TOOL_ID } from './submit_optimizer_result_tool';

/** Tool ids the reinforcement prompts interpolate — the same strings Agent Builder registers. */
export const DECISION_TREE_PROMPT_TOOLS: DecisionTreePromptTools = {
  viewFileTool: SANDBOX_VIEW_FILE_TOOL_ID,
  strReplaceTool: SANDBOX_STR_REPLACE_TOOL_ID,
  writeFileTool: SANDBOX_WRITE_FILE_TOOL_ID,
  submitTool: DECISION_TREE_SUBMIT_TOOL_ID,
  recordSystemTool: RECORD_SYSTEM_LEARNING_TOOL_ID,
  recordToolTool: RECORD_TOOL_LEARNING_TOOL_ID,
  recordRemediationTool: RECORD_REMEDIATION_TOOL_ID,
};
