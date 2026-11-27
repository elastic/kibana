/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementUiActions } from '@kbn/workflows';
import { getMissingCapabilitiesChecker } from '../../common/service/capabilities';
import { requiredWorkflowMigrationCapabilities } from './capabilities';

const getCapabilities = ({
  siemMigrations = true,
  actionsExecute = true,
  workflows = {},
}: {
  siemMigrations?: boolean;
  actionsExecute?: boolean;
  workflows?: Partial<Record<WorkflowsManagementUiActions, boolean>>;
} = {}) =>
  ({
    [SIEM_MIGRATIONS_FEATURE_ID]: { all: siemMigrations },
    actions: { execute: actionsExecute },
    [WORKFLOWS_MANAGEMENT_FEATURE_ID]: workflows,
  } as unknown as Capabilities);

const allWorkflowsPrivileges = {
  [WorkflowsManagementUiActions.read]: true,
  [WorkflowsManagementUiActions.create]: true,
  [WorkflowsManagementUiActions.update]: true,
};

const getMissing = (capabilities: Capabilities, level: 'minimum' | 'all') =>
  getMissingCapabilitiesChecker(requiredWorkflowMigrationCapabilities)(capabilities, level).map(
    ({ capability }) => capability
  );

describe('requiredWorkflowMigrationCapabilities', () => {
  describe('minimum level', () => {
    it('should require workflows read and actions execute', () => {
      const missing = getMissing(getCapabilities({ actionsExecute: false }), 'minimum');

      expect(missing).toEqual(['actions.execute', 'workflowsManagement.readWorkflow']);
    });

    it('should report nothing missing when SIEM migrations, actions execute and workflows read are granted', () => {
      const capabilities = getCapabilities({
        workflows: { [WorkflowsManagementUiActions.read]: true },
      });

      expect(getMissing(capabilities, 'minimum')).toEqual([]);
    });

    it('should report the SIEM migrations capability as missing when it is not granted', () => {
      const capabilities = getCapabilities({
        siemMigrations: false,
        workflows: { [WorkflowsManagementUiActions.read]: true },
      });

      expect(getMissing(capabilities, 'minimum')).toEqual([`${SIEM_MIGRATIONS_FEATURE_ID}.all`]);
    });
  });

  describe('all level', () => {
    it('should require workflows read, create and update on top of the minimum level', () => {
      const capabilities = getCapabilities({ workflows: {} });

      expect(getMissing(capabilities, 'all')).toEqual([
        'workflowsManagement.readWorkflow',
        'workflowsManagement.createWorkflow',
        'workflowsManagement.updateWorkflow',
      ]);
    });

    it('should report nothing missing when every required capability is granted', () => {
      const capabilities = getCapabilities({ workflows: allWorkflowsPrivileges });

      expect(getMissing(capabilities, 'all')).toEqual([]);
    });
  });
});
