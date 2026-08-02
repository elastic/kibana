/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

import {
  WorkflowsManagedReadForbiddenError,
  assertCanReadManagedWorkflow,
  assertCanReadManagedWorkflowExecutions,
  assertCanReadManagedWorkflows,
  canReadManagedWorkflowExecutions,
  canReadManagedWorkflows,
  canReadWorkflowExecutions,
} from './workflows_read_authz';

const requestWith = (authzResult: Record<string, boolean>): KibanaRequest =>
  ({ authzResult } as unknown as KibanaRequest);

const allPrivileges = {
  [WorkflowsManagementApiActions.read]: true,
  [WorkflowsManagementApiActions.readManaged]: true,
  [WorkflowsManagementApiActions.readExecution]: true,
  [WorkflowsManagementApiActions.readManagedExecution]: true,
};

describe('workflows_read_authz', () => {
  describe('canReadManagedWorkflows', () => {
    it('returns true when both read and readManaged are granted', () => {
      const request = requestWith({
        [WorkflowsManagementApiActions.read]: true,
        [WorkflowsManagementApiActions.readManaged]: true,
      });

      expect(canReadManagedWorkflows(request)).toBe(true);
    });

    it('returns false when only read is granted', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.read]: true });

      expect(canReadManagedWorkflows(request)).toBe(false);
    });

    it('returns false when authzResult is absent', () => {
      const request = {} as KibanaRequest;

      expect(canReadManagedWorkflows(request)).toBe(false);
    });
  });

  describe('canReadWorkflowExecutions', () => {
    it('returns true when readExecution is granted', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.readExecution]: true });

      expect(canReadWorkflowExecutions(request)).toBe(true);
    });

    it('returns false when readExecution is missing', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.read]: true });

      expect(canReadWorkflowExecutions(request)).toBe(false);
    });
  });

  describe('canReadManagedWorkflowExecutions', () => {
    it('returns true when both readExecution and readManagedExecution are granted', () => {
      const request = requestWith(allPrivileges);

      expect(canReadManagedWorkflowExecutions(request)).toBe(true);
    });

    it('returns false when readManagedExecution is missing', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.readExecution]: true });

      expect(canReadManagedWorkflowExecutions(request)).toBe(false);
    });
  });

  describe('assertCanReadManagedWorkflows', () => {
    it('does not throw when managed read is granted', () => {
      const request = requestWith({
        [WorkflowsManagementApiActions.read]: true,
        [WorkflowsManagementApiActions.readManaged]: true,
      });

      expect(() => assertCanReadManagedWorkflows(request)).not.toThrow();
    });

    it('throws WorkflowsManagedReadForbiddenError when managed read is missing', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.read]: true });

      expect(() => assertCanReadManagedWorkflows(request)).toThrow(
        WorkflowsManagedReadForbiddenError
      );
    });
  });

  describe('assertCanReadManagedWorkflowExecutions', () => {
    it('does not throw when managed-execution read is granted', () => {
      const request = requestWith(allPrivileges);

      expect(() => assertCanReadManagedWorkflowExecutions(request)).not.toThrow();
    });

    it('throws WorkflowsManagedReadForbiddenError when managed-execution read is missing', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.readExecution]: true });

      expect(() => assertCanReadManagedWorkflowExecutions(request)).toThrow(
        WorkflowsManagedReadForbiddenError
      );
    });

    it('names the missing managed-execution privilege', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.readExecution]: true });

      expect(() => assertCanReadManagedWorkflowExecutions(request)).toThrow(
        'Missing Workflows managed execution read privilege'
      );
    });
  });

  describe('assertCanReadManagedWorkflow', () => {
    it('does not throw for an unmanaged workflow even without managed read', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.read]: true });

      expect(() => assertCanReadManagedWorkflow(request, { managed: false })).not.toThrow();
    });

    it('does not throw for a null workflow', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.read]: true });

      expect(() => assertCanReadManagedWorkflow(request, null)).not.toThrow();
    });

    it('throws for a managed workflow when managed read is missing', () => {
      const request = requestWith({ [WorkflowsManagementApiActions.read]: true });

      expect(() => assertCanReadManagedWorkflow(request, { managed: true })).toThrow(
        WorkflowsManagedReadForbiddenError
      );
    });

    it('does not throw for a managed workflow when managed read is granted', () => {
      const request = requestWith(allPrivileges);

      expect(() => assertCanReadManagedWorkflow(request, { managed: true })).not.toThrow();
    });
  });

  describe('WorkflowsManagedReadForbiddenError', () => {
    it('carries a 403 statusCode', () => {
      expect(new WorkflowsManagedReadForbiddenError().statusCode).toBe(403);
    });
  });
});
