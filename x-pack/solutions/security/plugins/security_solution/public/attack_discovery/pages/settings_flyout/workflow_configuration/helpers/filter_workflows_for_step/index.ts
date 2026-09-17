/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VALIDATION_ALLOWLIST_WORKFLOW_IDS } from '../../constants';
import type { WorkflowItem } from '../../types';

/**
 * Filters workflows for the alert retrieval step (Step 1).
 *
 * Managed (system) workflows are intended to be hidden from users, so only
 * user-created (unmanaged) workflows are selectable here.
 */
export const filterWorkflowsForAlertRetrieval = (workflows: WorkflowItem[]): WorkflowItem[] =>
  workflows.filter((workflow) => !workflow.managed);

/**
 * Filters workflows for the validation step (Step 3).
 *
 * Managed (system) workflows are hidden EXCEPT the validation workflows in the
 * allowlist (Default validation and the Custom validation example), which must
 * remain selectable. User-created (unmanaged) workflows are always included.
 */
export const filterWorkflowsForValidation = (workflows: WorkflowItem[]): WorkflowItem[] =>
  workflows.filter(
    (workflow) => !workflow.managed || VALIDATION_ALLOWLIST_WORKFLOW_IDS.has(workflow.id)
  );
