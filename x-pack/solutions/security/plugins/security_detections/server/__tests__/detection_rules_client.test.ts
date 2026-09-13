/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Steps 8.4 and 8.5 — DetectionRulesClient unit tests.
 *
 * Step 8.4 covers every branch the design names:
 *   - createRule: happy path (query, threshold), enabled default is false.
 *   - replaceRule (PUT): happy path, 404 for missing rule, 409 for type change,
 *     reset of omitted defaultables (the "PUT reset" invariant).
 *   - patchRule (PATCH): happy path, empty-patch no-op, 400 for foreign fields,
 *     null-clears optional fields, 404 for missing rule.
 *   - deleteRule: happy path returning last state, 404 for missing rule.
 *   - getInScopeRule: 404 for out-of-scope rule, 404 for unknown builder_type,
 *     passthrough of framework 404.
 *
 * Step 8.5 adds:
 *   - getRule: happy path, 404 for out-of-scope (scoping test).
 *   - listRules: scoping fragment always ANDed in, structured filters each
 *     composed correctly (enabled, type, severity, tags, rule_ids), search
 *     pass-through, sort allowlist (severity rejected), fields projection
 *     (always includes id, extra fields kept, others dropped), foreign rules
 *     excluded via the scoping fragment.
 *   - getDetectionTags: scoping fragment passed to framework getTags.
 *   - enableRule / disableRule: scope-checked, framework called, revision
 *     unchanged in response.
 *
 * All framework client calls are mocked.  No kibana boot required.
 *
 * Ref: rule-crud-api.md "Create a rule", "Replace a rule with PUT",
 *      "Patch a rule with PATCH", "Delete a rule", "Validation layering"
 *      rule-fetch-api.md "One rule by object id", "The list endpoint",
 *      "Filtering", "Searching and sorting", "Field limitation", "The tags endpoint"
 *      rule-actions-api.md "The endpoints", "Semantics"
 */

import Boom from '@hapi/boom';
import { loggerMock } from '@kbn/logging-mocks';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { DetectionRulesClient } from '../detection_rules_client';
import type { DetectionRulesClientDeps, ListRulesParams } from '../detection_rules_client';
import type {
  DetectionRuleCreateProps,
  DetectionRuleUpdateProps,
  DetectionRulePatchProps,
} from '../../common/api';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeFrameworkClientMock() {
  return {
    createRule: jest.fn(),
    updateRule: jest.fn(),
    getRule: jest.fn(),
    deleteRule: jest.fn(),
    findRules: jest.fn(),
    getTags: jest.fn(),
    enableRule: jest.fn(),
    disableRule: jest.fn(),
  } as unknown as jest.Mocked<DetectionRulesClientDeps['frameworkClient']>;
}

function makeDeps(
  frameworkOverride?: Partial<ReturnType<typeof makeFrameworkClientMock>>
): DetectionRulesClientDeps {
  const frameworkClient = { ...makeFrameworkClientMock(), ...frameworkOverride };
  return {
    frameworkClient: frameworkClient as never,
    logger: loggerMock.create(),
  };
}

/**
 * Build a minimal framework RuleResponse that is in scope.
 * The concurrency token is exposed as `version` on the stored object.
 */
function makeInScopeRuleResponse(overrides: Partial<RuleResponse> = {}): RuleResponse & {
  version?: string;
} {
  const base: RuleResponse & { version?: string } = {
    id: 'rule-id-1',
    version: 'abc123', // saved-object concurrency token
    enabled: false,
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: 'elastic',
    updated_at: '2024-01-02T00:00:00.000Z',
    updated_by: 'elastic',
    kind: 'signal',
    schedule: { every: '5m' },
    metadata: {
      name: 'Test rule',
      description: 'Test description',
      tags: ['tag1'],
      signature_id: 'rule-sig-1',
      revision: 0,
      builder_type: 'security.detection.query',
      builder_fields: {
        severity: 'low',
        risk_score: 21,
        index: ['logs-*'],
        query: 'process.name: "cmd.exe"',
        language: 'kuery',
        max_signals: 100,
        threat: [],
        setup: '',
        references: [],
        false_positives: [],
        author: [],
        related_integrations: [],
        required_fields: [],
      },
      source: { type: 'internal', version: 1 },
      ownership: {
        managed: true,
        solution: 'security',
        domain: 'detection',
      },
    },
  } as unknown as RuleResponse & { version?: string };

  return { ...base, ...overrides } as RuleResponse & { version?: string };
}

function makeThresholdRuleResponse(overrides: Partial<RuleResponse> = {}): RuleResponse & {
  version?: string;
} {
  const base = makeInScopeRuleResponse();
  return {
    ...base,
    metadata: {
      ...base.metadata,
      builder_type: 'security.detection.threshold',
      builder_fields: {
        ...(base.metadata?.builder_fields as Record<string, unknown>),
        query: '',
        threshold: { field: ['host.name'], value: 5 },
      },
    },
    ...overrides,
  } as RuleResponse & { version?: string };
}

// ---------------------------------------------------------------------------
// Tests: createRule
// ---------------------------------------------------------------------------

describe('DetectionRulesClient', () => {
  describe('createRule', () => {
    it('creates a query rule with enabled defaulting to false', async () => {
      const storedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.createRule as jest.Mock).mockResolvedValueOnce(storedRule);

      const client = new DetectionRulesClient(makeDeps({ createRule: frameworkClient.createRule }));

      const props: DetectionRuleCreateProps = {
        type: 'query',
        name: 'Test rule',
        description: 'A test rule',
        severity: 'low',
        risk_score: 21,
        index: ['logs-*'],
        query: 'process.name: "cmd.exe"',
      };

      const result = await client.createRule(props);

      // The framework createRule was called.
      expect(frameworkClient.createRule).toHaveBeenCalledTimes(1);

      const [callArgs] = (frameworkClient.createRule as jest.Mock).mock.calls[0];
      // Default enabled = false.
      expect(callArgs.options?.enabled).toBe(false);
      // Kind must be 'signal'.
      expect(callArgs.data.kind).toBe('signal');
      // The builder_type must be the namespaced id.
      expect(callArgs.data.metadata.builder_type).toBe('security.detection.query');
      // builder_fields must contain the detection fields.
      expect(callArgs.data.metadata.builder_fields.severity).toBe('low');
      // No grouping on the create payload.
      expect(callArgs.data.grouping).toBeUndefined();

      // Response has the public type alias.
      expect(result.type).toBe('query');
      expect(result.id).toBe('rule-id-1');
    });

    it('creates a rule enabled when caller passes enabled: true', async () => {
      const storedRule = makeInScopeRuleResponse({ enabled: true });
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.createRule as jest.Mock).mockResolvedValueOnce(storedRule);

      const client = new DetectionRulesClient(makeDeps({ createRule: frameworkClient.createRule }));

      await client.createRule({
        type: 'query',
        name: 'Test',
        description: 'Test',
        severity: 'low',
        risk_score: 21,
        index: ['logs-*'],
        query: 'process.name: "cmd.exe"',
        enabled: true,
      });

      const [callArgs] = (frameworkClient.createRule as jest.Mock).mock.calls[0];
      expect(callArgs.options?.enabled).toBe(true);
    });

    it('creates a threshold rule', async () => {
      const storedRule = makeThresholdRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.createRule as jest.Mock).mockResolvedValueOnce(storedRule);

      const client = new DetectionRulesClient(makeDeps({ createRule: frameworkClient.createRule }));

      await client.createRule({
        type: 'threshold',
        name: 'Threshold rule',
        description: 'Counts by host',
        severity: 'medium',
        risk_score: 47,
        index: ['logs-*'],
        query: '',
        threshold: { field: ['host.name'], value: 5 },
      });

      const [callArgs] = (frameworkClient.createRule as jest.Mock).mock.calls[0];
      expect(callArgs.data.metadata.builder_type).toBe('security.detection.threshold');
      expect(callArgs.data.metadata.builder_fields.threshold).toEqual({
        field: ['host.name'],
        value: 5,
      });
    });

    it('passes through a 409 framework error when the rule_id already exists', async () => {
      const frameworkClient = makeFrameworkClientMock();
      const conflictError = Boom.conflict('signature id already exists', {
        code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS,
      });
      (frameworkClient.createRule as jest.Mock).mockRejectedValueOnce(conflictError);

      const client = new DetectionRulesClient(makeDeps({ createRule: frameworkClient.createRule }));

      await expect(
        client.createRule({
          type: 'query',
          name: 'Dup rule',
          description: 'Dup',
          severity: 'low',
          risk_score: 21,
          index: ['logs-*'],
          query: 'process.name: "cmd.exe"',
          rule_id: 'my-sig-id',
        })
      ).rejects.toMatchObject({ output: { statusCode: 409 } });
    });
  });

  // -------------------------------------------------------------------------
  // replaceRule (PUT)
  // -------------------------------------------------------------------------

  describe('replaceRule', () => {
    it('reads the rule, applies defaults, and writes the full replacement', async () => {
      const existingRule = makeInScopeRuleResponse();
      const updatedRule = makeInScopeRuleResponse();

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      const props: DetectionRuleUpdateProps = {
        type: 'query',
        name: 'Updated name',
        description: 'Updated description',
        severity: 'high',
        risk_score: 73,
        index: ['logs-*'],
        query: 'process.name: "powershell.exe"',
      };

      const result = await client.replaceRule('rule-id-1', props);

      // getRule was called first.
      expect(frameworkClient.getRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      // updateRule was called.
      expect(frameworkClient.updateRule).toHaveBeenCalledTimes(1);
      const [updateArgs] = (frameworkClient.updateRule as jest.Mock).mock.calls[0];
      expect(updateArgs.id).toBe('rule-id-1');
      // Concurrency token from the existing rule.
      expect(updateArgs.options?.version).toBe('abc123');
      // The result is the converted public response.
      expect(result.type).toBe('query');
    });

    it('throws 409 when the payload type differs from the stored type', async () => {
      const existingRule = makeInScopeRuleResponse(); // query type
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(
        client.replaceRule('rule-id-1', {
          type: 'threshold', // differs from stored 'query'
          name: 'Changed type',
          description: 'Attempt to change type',
          severity: 'medium',
          risk_score: 47,
          index: ['logs-*'],
          query: '',
          threshold: { field: ['host.name'], value: 5 },
        })
      ).rejects.toMatchObject({ output: { statusCode: 409 } });

      // updateRule was never called.
      expect(frameworkClient.updateRule).not.toHaveBeenCalled();
    });

    it('throws 404 when the rule does not exist', async () => {
      const frameworkClient = makeFrameworkClientMock();
      const notFoundError = Boom.notFound('Rule not found', {
        code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
      });
      (frameworkClient.getRule as jest.Mock).mockRejectedValueOnce(notFoundError);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(
        client.replaceRule('missing-id', {
          type: 'query',
          name: 'Test',
          description: 'Test',
          severity: 'low',
          risk_score: 21,
          index: ['logs-*'],
          query: 'process.name: "cmd.exe"',
        })
      ).rejects.toMatchObject({ output: { statusCode: 404 } });
    });

    it('resets omitted defaultable fields to their defaults (PUT reset invariant)', async () => {
      // The stored rule has tags, max_signals, references etc. set.
      const existingRule = makeInScopeRuleResponse();
      (existingRule.metadata!.builder_fields as Record<string, unknown>).max_signals = 999;
      (existingRule.metadata!.tags as unknown) = ['old-tag'];

      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // PUT payload with no max_signals (omitted → should reset to default 100),
      // no tags (omitted → should reset to default []).
      await client.replaceRule('rule-id-1', {
        type: 'query',
        name: 'Minimal PUT',
        description: 'Testing defaults reset',
        severity: 'low',
        risk_score: 21,
        index: ['logs-*'],
        query: 'process.name: "cmd.exe"',
      });

      const [updateArgs] = (frameworkClient.updateRule as jest.Mock).mock.calls[0];
      // max_signals not in payload → default applies (100); builder_fields should carry it.
      expect(updateArgs.data.metadata.builder_fields.max_signals).toBe(100);
      // Tags omitted from PUT → default is []; converter sends null (not undefined) so
      // the framework clears any stored tags rather than keeping them unchanged.
      expect(updateArgs.data.metadata.tags).toBeNull();
    });

    it('sends null for lookback when schedule.lookback is omitted (PUT clear invariant)', async () => {
      const existingRule = makeInScopeRuleResponse();
      (existingRule as Record<string, unknown>).schedule = { every: '5m', lookback: '1m' };

      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // PUT payload without a lookback — replaceRule must send null so the
      // framework clears the stored lookback rather than leaving it unchanged.
      await client.replaceRule('rule-id-1', {
        type: 'query',
        name: 'No lookback PUT',
        description: 'Testing lookback clear',
        severity: 'low',
        risk_score: 21,
        index: ['logs-*'],
        query: 'process.name: "cmd.exe"',
      });

      const [updateArgs] = (frameworkClient.updateRule as jest.Mock).mock.calls[0];
      // schedule.lookback absent from PUT → must be null, not undefined.
      expect(updateArgs.data.schedule.lookback).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // patchRule (PATCH)
  // -------------------------------------------------------------------------

  describe('patchRule', () => {
    it('merges the patch over the stored state and writes the result', async () => {
      const existingRule = makeInScopeRuleResponse();
      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      const patch: DetectionRulePatchProps = { name: 'Patched name' };
      const result = await client.patchRule('rule-id-1', patch);

      expect(frameworkClient.getRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      expect(frameworkClient.updateRule).toHaveBeenCalledTimes(1);
      const [updateArgs] = (frameworkClient.updateRule as jest.Mock).mock.calls[0];
      expect(updateArgs.id).toBe('rule-id-1');
      expect(updateArgs.data.metadata.name).toBe('Patched name');
      // Concurrency token passed through.
      expect(updateArgs.options?.version).toBe('abc123');
      expect(result.type).toBe('query');
    });

    it('accepts an empty patch body (no-op beyond framework mutation sequence)', async () => {
      const existingRule = makeInScopeRuleResponse();
      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // Empty patch body.
      await client.patchRule('rule-id-1', {});

      // updateRule is still called (framework's mutation sequence always runs).
      expect(frameworkClient.updateRule).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when a patch field does not belong to the stored type', async () => {
      // The stored rule is a 'query' type.
      const existingRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // `threshold` does not belong to a query rule.
      const patch: DetectionRulePatchProps = {
        threshold: { field: ['host.name'], value: 5 },
      };

      await expect(client.patchRule('rule-id-1', patch)).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      // updateRule was never called.
      expect(frameworkClient.updateRule).not.toHaveBeenCalled();
    });

    it('clears an optional field when null is sent', async () => {
      const existingRule = makeInScopeRuleResponse();
      (existingRule.metadata!.builder_fields as Record<string, unknown>).note = 'old note';

      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // Patch with null clears the `note` field.
      await client.patchRule('rule-id-1', { note: null });

      const [updateArgs] = (frameworkClient.updateRule as jest.Mock).mock.calls[0];
      // The note key must not be in builder_fields (it was cleared).
      expect(
        (updateArgs.data.metadata.builder_fields as Record<string, unknown>).note
      ).toBeUndefined();
    });

    it('throws 404 when the rule does not exist', async () => {
      const frameworkClient = makeFrameworkClientMock();
      const notFoundError = Boom.notFound('Rule not found', {
        code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
      });
      (frameworkClient.getRule as jest.Mock).mockRejectedValueOnce(notFoundError);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.patchRule('missing-id', { name: 'x' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('clears lookback when schedule.lookback is null', async () => {
      const existingRule = makeInScopeRuleResponse();
      // Set a stored lookback.
      (existingRule as unknown as { schedule: Record<string, unknown> }).schedule = {
        every: '5m',
        lookback: '6m',
      };

      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await client.patchRule('rule-id-1', { schedule: { lookback: null } });

      const [updateArgs] = (frameworkClient.updateRule as jest.Mock).mock.calls[0];
      // lookback should be explicitly null in the schedule (to clear the stored value).
      expect(updateArgs.data.schedule?.lookback).toBeNull();
    });

    it('throws 409 when rule_id in the patch differs from the stored signature_id', async () => {
      const existingRule = makeInScopeRuleResponse();
      // The stored rule has signature_id 'existing-rule-id'.
      existingRule.metadata!.signature_id = 'existing-rule-id';

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // Attempting to change rule_id must be rejected — rule_id is immutable.
      await expect(
        client.patchRule('rule-id-1', { rule_id: 'different-rule-id' })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: { code: 'RULE_TYPE_IMMUTABLE' },
      });

      // The framework update must not be called — the error is thrown before it.
      expect(frameworkClient.updateRule).not.toHaveBeenCalled();
    });

    it('accepts a patch where rule_id matches the stored signature_id (no-op identity check)', async () => {
      const existingRule = makeInScopeRuleResponse();
      existingRule.metadata!.signature_id = 'same-rule-id';

      const updatedRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.updateRule as jest.Mock).mockResolvedValueOnce(updatedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // rule_id that matches the stored value must pass through without error.
      await expect(
        client.patchRule('rule-id-1', { rule_id: 'same-rule-id' })
      ).resolves.toBeDefined();

      expect(frameworkClient.updateRule).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // deleteRule
  // -------------------------------------------------------------------------

  describe('deleteRule', () => {
    it('reads, deletes, and returns the last state', async () => {
      const existingRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(existingRule);
      (frameworkClient.deleteRule as jest.Mock).mockResolvedValueOnce(undefined);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      const result = await client.deleteRule('rule-id-1');

      expect(frameworkClient.getRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      expect(frameworkClient.deleteRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      // Returns the last state as the public response.
      expect(result.id).toBe('rule-id-1');
      expect(result.type).toBe('query');
    });

    it('throws 404 when the rule does not exist', async () => {
      const frameworkClient = makeFrameworkClientMock();
      const notFoundError = Boom.notFound('Rule not found', {
        code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
      });
      (frameworkClient.getRule as jest.Mock).mockRejectedValueOnce(notFoundError);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.deleteRule('missing-id')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      // deleteRule on the framework is never called.
      expect(frameworkClient.deleteRule).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getInScopeRule (scope check helper)
  // -------------------------------------------------------------------------

  describe('getInScopeRule', () => {
    it('returns the rule when it is in scope', async () => {
      const inScopeRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(inScopeRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      const result = await client.getInScopeRule('rule-id-1');
      expect(result.id).toBe('rule-id-1');
    });

    it('throws 404 when the rule is not a detection rule (foreign ownership)', async () => {
      const foreignRule = makeInScopeRuleResponse();
      // Override ownership to a different solution.
      (foreignRule.metadata!.ownership as Record<string, unknown>) = {
        managed: true,
        solution: 'apm',
        domain: 'slo',
      };
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(foreignRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.getInScopeRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 404 when the rule has an unmanaged ownership', async () => {
      const unmanagedRule = makeInScopeRuleResponse();
      (unmanagedRule.metadata!.ownership as Record<string, unknown>) = { managed: false };
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(unmanagedRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.getInScopeRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 404 when the builder_type is unknown (rollback scenario)', async () => {
      const rollbackRule = makeInScopeRuleResponse();
      // A newer type this build does not know.
      (rollbackRule.metadata as Record<string, unknown>).builder_type = 'security.detection.eql'; // not registered

      const logger = loggerMock.create();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(rollbackRule);

      const client = new DetectionRulesClient({
        frameworkClient: frameworkClient as never,
        logger,
      });

      await expect(client.getInScopeRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      // A warning should be logged for the rollback case.
      expect(logger.warn).toHaveBeenCalled();
    });

    it('re-throws the framework 404 when the id does not exist', async () => {
      const frameworkClient = makeFrameworkClientMock();
      const notFoundError = Boom.notFound('Rule not found', {
        code: ALERTING_ERROR_CODES.RULE_NOT_FOUND,
      });
      (frameworkClient.getRule as jest.Mock).mockRejectedValueOnce(notFoundError);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.getInScopeRule('missing-id')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Step 8.5: getRule
  // -------------------------------------------------------------------------

  describe('getRule', () => {
    it('returns the public response for an in-scope rule', async () => {
      const inScopeRule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(inScopeRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.getRule('rule-id-1');

      expect(result.id).toBe('rule-id-1');
      expect(result.type).toBe('query');
    });

    it('throws 404 for a foreign (out-of-scope) rule — scoping test', async () => {
      const foreignRule = makeInScopeRuleResponse();
      (foreignRule.metadata!.ownership as Record<string, unknown>) = {
        managed: true,
        solution: 'apm',
        domain: 'slo',
      };
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(foreignRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.getRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 404 for a detection rule with an unknown builder_type (rollback state)', async () => {
      const rollbackRule = makeInScopeRuleResponse();
      (rollbackRule.metadata as Record<string, unknown>).builder_type = 'security.detection.eql';

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(rollbackRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.getRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Step 8.5: listRules
  // -------------------------------------------------------------------------

  /**
   * Helper — builds a minimal FindRulesResult from framework client mocks.
   * The `filter` passed to framework.findRules is what we assert on.
   */
  function makeFindResult(rules: Array<ReturnType<typeof makeInScopeRuleResponse>>) {
    return {
      items: rules,
      total: rules.length,
      page: 1,
      per_page: 20,
    };
  }

  describe('listRules', () => {
    it('always ANDs the scoping fragment into the framework filter', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(
        makeFindResult([makeInScopeRuleResponse()])
      );

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({});

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      // The scoping fragment must always be present.
      expect(callArgs.filter).toContain('metadata.ownership.managed: true');
      expect(callArgs.filter).toContain('metadata.ownership.solution: "security"');
      expect(callArgs.filter).toContain('metadata.ownership.domain: "detection"');
      expect(callArgs.filter).toContain('metadata.builder_type:');
    });

    it('derives the builder_type clause from the alias map (not hardcoded)', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({});

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      // Both registered types must appear.
      expect(callArgs.filter).toContain('security.detection.query');
      expect(callArgs.filter).toContain('security.detection.threshold');
    });

    it('a foreign rule never appears: scoping excludes unmanaged rules', async () => {
      // The framework mock returns both in-scope and a "foreign" rule.
      // In reality the filter prevents this; here we verify the filter contains
      // the ownership fragment that makes the framework exclude them.
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({});

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      // The ownership fragment ensures managed: true + correct solution + domain.
      expect(callArgs.filter).toContain('metadata.ownership.managed: true');
      expect(callArgs.filter).toContain('metadata.ownership.solution: "security"');
    });

    it('composes enabled filter', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ enabled: true });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.filter).toContain('enabled: true');
    });

    it('composes type filter: single alias translated to builder type id', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ type: ['query'] });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.filter).toContain('metadata.builder_type: "security.detection.query"');
    });

    it('composes type filter: multiple aliases ORed', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ type: ['query', 'threshold'] });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.filter).toContain('security.detection.query');
      expect(callArgs.filter).toContain('security.detection.threshold');
      // Both should be ORed together.
      expect(callArgs.filter).toContain(' or ');
    });

    it('composes severity filter: multiple values ORed', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ severity: ['low', 'high'] });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.filter).toContain('metadata.builder_fields.severity: "low"');
      expect(callArgs.filter).toContain('metadata.builder_fields.severity: "high"');
    });

    it('composes tags filter', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ tags: ['os:windows', 'tactic:discovery'] });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.filter).toContain('metadata.tags: "os:windows"');
      expect(callArgs.filter).toContain('metadata.tags: "tactic:discovery"');
    });

    it('composes rule_ids filter using signature_id field', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ rule_ids: ['sig-001', 'sig-002'] });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.filter).toContain('metadata.signature_id: "sig-001"');
      expect(callArgs.filter).toContain('metadata.signature_id: "sig-002"');
    });

    it('ANDs separate filter parameters together', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ enabled: true, severity: ['low'] });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      // Both filters must appear, joined with AND (not OR).
      expect(callArgs.filter).toContain('enabled: true');
      expect(callArgs.filter).toContain('metadata.builder_fields.severity: "low"');
      // The filter contains ' and ' (the cross-parameter AND).
      expect(callArgs.filter.toLowerCase()).toContain(' and ');
    });

    it('passes search straight through to the framework', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ search: 'powershell' });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.search).toBe('powershell');
    });

    it('maps name sort field to the framework sort field', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ sort_field: 'name', sort_order: 'asc' });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.sortField).toBe('name');
      expect(callArgs.sortOrder).toBe('asc');
    });

    it('maps risk_score sort field to builder_fields.risk_score', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ sort_field: 'risk_score' });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.sortField).toBe('builder_fields.risk_score');
    });

    it('maps enabled sort field to the framework sort field', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      await client.listRules({ sort_field: 'enabled' });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.sortField).toBe('enabled');
    });

    it('rejects severity as a sort field — it is deliberately not sortable', async () => {
      const frameworkClient = makeFrameworkClientMock();
      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      // Cast through unknown to allow passing 'severity' in tests — the type
      // does not include it precisely because the API rejects it.
      await expect(
        client.listRules({ sort_field: 'severity' as unknown as ListRulesParams['sort_field'] })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      // Framework find was never called.
      expect(frameworkClient.findRules).not.toHaveBeenCalled();
    });

    it('applies fields projection: only requested fields plus id are returned', async () => {
      const rule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([rule]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.listRules({ fields: ['name', 'enabled'] });

      // id is always included.
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('name');
      expect(result.data[0]).toHaveProperty('enabled');
      // Other fields like type, risk_score etc. must be absent.
      expect(result.data[0]).not.toHaveProperty('risk_score');
      expect(result.data[0]).not.toHaveProperty('severity');
    });

    it('fields projection always includes id even when not in the fields list', async () => {
      const rule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([rule]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.listRules({ fields: ['name'] });

      expect(result.data[0]).toHaveProperty('id');
    });

    it('returns full rules when fields is not provided', async () => {
      const rule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([rule]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.listRules({});

      // No projection — full converted rule is returned.
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('type');
      expect(result.data[0]).toHaveProperty('severity');
    });

    it('passes pagination through to the framework', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce({
        items: [],
        total: 42,
        page: 3,
        per_page: 10,
      });

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.listRules({ page: 3, per_page: 10 });

      const [callArgs] = (frameworkClient.findRules as jest.Mock).mock.calls[0];
      expect(callArgs.page).toBe(3);
      expect(callArgs.perPage).toBe(10);
      expect(result.page).toBe(3);
      expect(result.per_page).toBe(10);
      expect(result.total).toBe(42);
    });

    it('returns the response envelope with page, per_page, total, data', async () => {
      const rule = makeInScopeRuleResponse();
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.findRules as jest.Mock).mockResolvedValueOnce(makeFindResult([rule]));

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.listRules({});

      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('per_page');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Step 8.5: getDetectionTags
  // -------------------------------------------------------------------------

  describe('getDetectionTags', () => {
    it('calls framework getTags with the scoping fragment as the filter', async () => {
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getTags as jest.Mock).mockResolvedValueOnce(['tag-a', 'tag-b']);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.getDetectionTags();

      const [callArgs] = (frameworkClient.getTags as jest.Mock).mock.calls[0];
      // The scoping fragment must be passed as the filter.
      expect(callArgs.filter).toContain('metadata.ownership.managed: true');
      expect(callArgs.filter).toContain('metadata.ownership.solution: "security"');
      expect(callArgs.filter).toContain('metadata.ownership.domain: "detection"');
      expect(callArgs.filter).toContain('metadata.builder_type:');
      // Returns the tags from the framework as-is.
      expect(result).toEqual(['tag-a', 'tag-b']);
    });
  });

  // -------------------------------------------------------------------------
  // Step 8.5: enableRule / disableRule
  // -------------------------------------------------------------------------

  describe('enableRule', () => {
    it('scope-checks and calls framework enableRule, returning the public response', async () => {
      const ruleBeforeToggle = makeInScopeRuleResponse({ enabled: false });
      const ruleAfterToggle = makeInScopeRuleResponse({ enabled: true });

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(ruleBeforeToggle);
      (frameworkClient.enableRule as jest.Mock).mockResolvedValueOnce(ruleAfterToggle);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.enableRule('rule-id-1');

      expect(frameworkClient.getRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      expect(frameworkClient.enableRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      expect(result.enabled).toBe(true);
    });

    it('throws 404 for a foreign rule (scoping enforced before toggle)', async () => {
      const foreignRule = makeInScopeRuleResponse();
      (foreignRule.metadata!.ownership as Record<string, unknown>) = {
        managed: true,
        solution: 'apm',
        domain: 'slo',
      };
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(foreignRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.enableRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      // Framework enableRule was never called.
      expect(frameworkClient.enableRule).not.toHaveBeenCalled();
    });

    it('revision stays at the same value after enable (the framework does not move it)', async () => {
      const ruleBeforeToggle = makeInScopeRuleResponse({ enabled: false });
      // The revision is 0 in makeInScopeRuleResponse; the framework does not
      // touch it in enableRule, so the returned rule has the same revision.
      const ruleAfterToggle = makeInScopeRuleResponse({ enabled: true });

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(ruleBeforeToggle);
      (frameworkClient.enableRule as jest.Mock).mockResolvedValueOnce(ruleAfterToggle);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.enableRule('rule-id-1');

      // revision in the response must equal the stored revision (0).
      expect(result.revision).toBe(0);
    });
  });

  describe('disableRule', () => {
    it('scope-checks and calls framework disableRule, returning the public response', async () => {
      const ruleBeforeToggle = makeInScopeRuleResponse({ enabled: true });
      const ruleAfterToggle = makeInScopeRuleResponse({ enabled: false });

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(ruleBeforeToggle);
      (frameworkClient.disableRule as jest.Mock).mockResolvedValueOnce(ruleAfterToggle);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.disableRule('rule-id-1');

      expect(frameworkClient.getRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      expect(frameworkClient.disableRule).toHaveBeenCalledWith({ id: 'rule-id-1' });
      expect(result.enabled).toBe(false);
    });

    it('throws 404 for a foreign rule', async () => {
      const foreignRule = makeInScopeRuleResponse();
      (foreignRule.metadata!.ownership as Record<string, unknown>) = {
        managed: false,
      };
      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(foreignRule);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));

      await expect(client.disableRule('rule-id-1')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      expect(frameworkClient.disableRule).not.toHaveBeenCalled();
    });

    it('revision stays at the same value after disable', async () => {
      const ruleBeforeToggle = makeInScopeRuleResponse({ enabled: true });
      const ruleAfterToggle = makeInScopeRuleResponse({ enabled: false });

      const frameworkClient = makeFrameworkClientMock();
      (frameworkClient.getRule as jest.Mock).mockResolvedValueOnce(ruleBeforeToggle);
      (frameworkClient.disableRule as jest.Mock).mockResolvedValueOnce(ruleAfterToggle);

      const client = new DetectionRulesClient(makeDeps(frameworkClient));
      const result = await client.disableRule('rule-id-1');

      expect(result.revision).toBe(0);
    });
  });
});
