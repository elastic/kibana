/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementUiActions } from '@kbn/workflows';
import {
  requiredSiemMigrationCapabilities,
  type CapabilitiesLevel,
  type MissingCapability,
} from '../../common/service/capabilities';

const workflowsCapability = (
  action: WorkflowsManagementUiActions,
  description: string
): MissingCapability => ({
  capability: `${WORKFLOWS_MANAGEMENT_FEATURE_ID}.${action}`,
  description,
});

const workflowsReadCapability = workflowsCapability(
  WorkflowsManagementUiActions.read,
  i18n.translate('xpack.securitySolution.siemMigrations.service.capabilities.workflowsRead', {
    defaultMessage: 'Workflows: Read',
  })
);

const workflowsCreateCapability = workflowsCapability(
  WorkflowsManagementUiActions.create,
  i18n.translate('xpack.securitySolution.siemMigrations.service.capabilities.workflowsCreate', {
    defaultMessage: 'Workflows: Create',
  })
);

const workflowsUpdateCapability = workflowsCapability(
  WorkflowsManagementUiActions.update,
  i18n.translate('xpack.securitySolution.siemMigrations.service.capabilities.workflowsUpdate', {
    defaultMessage: 'Workflows: Update',
  })
);

/**
 * Workflow migrations use the `minimum` level for starting and stopping a migration, and for
 * availability (unlike Rules and Dashboards, which use `all` for start and stop).
 * `minimum` includes `actions.execute` (connector access) from the shared `all` level, and
 * the Workflows read privilege. `all` adds the Workflows create and update privileges, required
 * for installing translated workflows.
 */
export const requiredWorkflowMigrationCapabilities: Record<CapabilitiesLevel, MissingCapability[]> =
  {
    minimum: [...requiredSiemMigrationCapabilities.all, workflowsReadCapability],
    all: [
      ...requiredSiemMigrationCapabilities.all,
      workflowsReadCapability,
      workflowsCreateCapability,
      workflowsUpdateCapability,
    ],
  };
