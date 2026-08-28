/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';

import { validateAlertRetrievalWorkflow } from '.';

describe('validateAlertRetrievalWorkflow', () => {
  const workflowId = 'workflow-default-alert-retrieval';

  const baseWorkflow: WorkflowDetailDto = {
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    definition: {
      enabled: true,
      name: 'Attack Discovery Alert Retrieval',
      steps: [],
      triggers: [],
      version: '1',
    },
    description: 'Test workflow',
    enabled: true,
    id: workflowId,
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    lastUpdatedBy: 'test-user',
    name: 'Attack Discovery Alert Retrieval',
    valid: true,
    yaml: 'name: Test',
  };

  describe('when workflow is missing', () => {
    let caughtError: unknown;

    beforeEach(() => {
      try {
        validateAlertRetrievalWorkflow(null, workflowId);
      } catch (e) {
        caughtError = e;
      }
    });

    it('throws an AttackDiscoveryError', () => {
      expect(caughtError).toBeInstanceOf(AttackDiscoveryError);
    });

    it('throws with errorCategory workflow_deleted', () => {
      expect((caughtError as AttackDiscoveryError).errorCategory).toBe('workflow_deleted');
    });

    it('throws with the correct workflowId', () => {
      expect((caughtError as AttackDiscoveryError).workflowId).toBe(workflowId);
    });

    it('throws with the correct message', () => {
      expect((caughtError as AttackDiscoveryError).message).toBe(
        `Alert retrieval workflow (id: ${workflowId}) not found. It may have been deleted. Reconfigure the alert retrieval workflow in Attack Discovery settings.`
      );
    });
  });

  describe('when workflow is not enabled', () => {
    let caughtError: unknown;

    beforeEach(() => {
      try {
        validateAlertRetrievalWorkflow({ ...baseWorkflow, enabled: false }, workflowId);
      } catch (e) {
        caughtError = e;
      }
    });

    it('throws an AttackDiscoveryError', () => {
      expect(caughtError).toBeInstanceOf(AttackDiscoveryError);
    });

    it('throws with errorCategory workflow_disabled', () => {
      expect((caughtError as AttackDiscoveryError).errorCategory).toBe('workflow_disabled');
    });

    it('throws with the correct workflowId', () => {
      expect((caughtError as AttackDiscoveryError).workflowId).toBe(workflowId);
    });

    it('throws with the correct message', () => {
      expect((caughtError as AttackDiscoveryError).message).toBe(
        `Alert retrieval workflow '${baseWorkflow.name}' (id: ${workflowId}) is not enabled. Enable it in the Workflows UI to resume generation.`
      );
    });
  });

  it('throws "not enabled" (not "no definition") when workflow is disabled and has no definition', () => {
    let caughtError: unknown;
    try {
      validateAlertRetrievalWorkflow(
        { ...baseWorkflow, enabled: false, definition: null },
        workflowId
      );
    } catch (e) {
      caughtError = e;
    }

    expect((caughtError as AttackDiscoveryError).errorCategory).toBe('workflow_disabled');
  });

  describe('when workflow is enabled but has no definition', () => {
    let caughtError: unknown;

    beforeEach(() => {
      try {
        validateAlertRetrievalWorkflow({ ...baseWorkflow, definition: null }, workflowId);
      } catch (e) {
        caughtError = e;
      }
    });

    it('throws an AttackDiscoveryError', () => {
      expect(caughtError).toBeInstanceOf(AttackDiscoveryError);
    });

    it('throws with errorCategory workflow_invalid', () => {
      expect((caughtError as AttackDiscoveryError).errorCategory).toBe('workflow_invalid');
    });

    it('throws with the correct workflowId', () => {
      expect((caughtError as AttackDiscoveryError).workflowId).toBe(workflowId);
    });

    it('throws with the correct message', () => {
      expect((caughtError as AttackDiscoveryError).message).toBe(
        `Alert retrieval workflow '${baseWorkflow.name}' (id: ${workflowId}) is missing a definition. Edit the workflow YAML to add a valid definition.`
      );
    });
  });

  describe('when workflow is not valid', () => {
    let caughtError: unknown;

    beforeEach(() => {
      try {
        validateAlertRetrievalWorkflow({ ...baseWorkflow, valid: false }, workflowId);
      } catch (e) {
        caughtError = e;
      }
    });

    it('throws an AttackDiscoveryError', () => {
      expect(caughtError).toBeInstanceOf(AttackDiscoveryError);
    });

    it('throws with errorCategory workflow_invalid', () => {
      expect((caughtError as AttackDiscoveryError).errorCategory).toBe('workflow_invalid');
    });

    it('throws with the correct workflowId', () => {
      expect((caughtError as AttackDiscoveryError).workflowId).toBe(workflowId);
    });

    it('throws with the correct message', () => {
      expect((caughtError as AttackDiscoveryError).message).toBe(
        `Alert retrieval workflow '${baseWorkflow.name}' (id: ${workflowId}) is not valid. The workflow YAML contains errors. Edit the workflow to fix configuration issues.`
      );
    });
  });

  it('returns the workflow when it is executable', () => {
    const validated = validateAlertRetrievalWorkflow(baseWorkflow, workflowId);

    expect(validated.id).toBe(workflowId);
  });
});
