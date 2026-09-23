/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { createSignificantSecurityEventAttachmentType } from './significant_security_event';
import { formatToText } from './test_utils';

const validPayload = {
  attachmentLabel: 'Significant Security Event',
  title: 'Suspicious lateral movement detected',
  severity: 'high' as const,
  confidence: 0.82,
  status: 'open' as const,
  source_watch: 'lateral-movement-watch',
  capability: 'lateral-movement-detection',
  run_id: 'run-123',
  report_id: 'tr-lateral-movement-2026-01',
  security_knowledge_indicators: [
    { type: 'technique', value: 'T1021', confidence: 0.9, technique_id: 'T1021' },
  ],
  entities: [
    { field: 'host.name' as const, value: 'srv-01' },
    { field: 'user.name' as const, value: 'jdoe' },
  ],
  timeline: [{ at: '2026-01-01T00:00:00Z', what: 'RDP session established' }],
  hypothesis_tested: 'Adversary used stolen credentials to move laterally',
  evidence_for: ['RDP session from unusual host'],
  evidence_against: [],
  evaluation_record_ref: 'eval-record-1',
};

describe('createSignificantSecurityEventAttachmentType', () => {
  const attachmentType = createSignificantSecurityEventAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  // Generic zod-shape cases (required fields, enum bounds, array caps) live in
  // common/significant_security_event_schema.test.ts. Only the schema's custom
  // superRefine checks are re-verified here, through the attachment type's own
  // validate() entry point.
  describe('validate', () => {
    it('rejects a technique indicator missing technique_id', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        security_knowledge_indicators: [{ type: 'technique', value: 'T1021' }],
      });

      expect(result.valid).toBe(false);
    });

    it('rejects an ioc indicator missing ioc', async () => {
      const result = await attachmentType.validate({
        ...validPayload,
        security_knowledge_indicators: [{ type: 'ioc', value: 'suspicious hash' }],
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('returns a text representation quoting the title, severity, and timeline', async () => {
      const value = await formatToText(attachmentType, formatContext, validPayload);

      expect(value).toContain(validPayload.title);
      expect(value).toContain('high');
      expect(value).toContain('RDP session established');
    });

    it('includes indicators, structured entities, evidence, and the evaluation record ref', async () => {
      const value = await formatToText(attachmentType, formatContext, validPayload);

      expect(value).toContain('technique: T1021 [T1021] (confidence 0.9)');
      expect(value).toContain('host.name: srv-01');
      expect(value).toContain('user.name: jdoe');
      expect(value).toContain('- RDP session from unusual host');
      expect(value).toContain('Evidence against:\n  none recorded');
      expect(value).toContain('Evaluation record: eval-record-1');
      expect(value).toContain('taxonomy labels, not Discover IOCs');
    });

    it('includes the report_id so the agent can tie the event back to its threat report', async () => {
      const value = await formatToText(attachmentType, formatContext, validPayload);

      expect(value).toContain(`Threat report: ${validPayload.report_id}`);
    });

    it('surfaces matched IOC and technique evidence on formatted events', async () => {
      const value = await formatToText(attachmentType, formatContext, {
        ...validPayload,
        events: [
          {
            event_id: 'evt-1',
            source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
            matched: { ioc: { type: 'ip', value: '203.0.113.5' }, field: 'destination.ip' },
          },
          {
            event_id: 'evt-2',
            source_index: '.ds-logs-endpoint.events.network-default-2026.09.22-000001',
            matched: { technique_id: 'T1021', field: 'process.command_line' },
          },
          {
            event_id: 'evt-3',
            source_index: '.ds-logs-endpoint.events.file-default-2026.09.22-000001',
          },
        ],
      });

      expect(value).toContain(
        '  evt-1 (.ds-logs-endpoint.events.process-default-2026.09.22-000001) [matched: ioc 203.0.113.5 on destination.ip]'
      );
      expect(value).toContain(
        '  evt-2 (.ds-logs-endpoint.events.network-default-2026.09.22-000001) [matched: technique T1021 on process.command_line]'
      );
      expect(value).toContain('  evt-3 (.ds-logs-endpoint.events.file-default-2026.09.22-000001)');
      expect(value).not.toContain(
        'evt-3 (.ds-logs-endpoint.events.file-default-2026.09.22-000001) [matched'
      );
    });

    it('renders maps_to_proposal details when present', async () => {
      const value = await formatToText(attachmentType, formatContext, {
        ...validPayload,
        maps_to_proposal: {
          category: 'containment',
          impact: 'Isolate affected hosts',
          confidence: 0.7,
          actionWorkflowId: 'workflow-1',
          actionInput: { endpoint_ids: 'abc-123', force: true },
          manual_remediation: ['Rotate the compromised key'],
        },
      });

      expect(value).toContain('Maps to proposal:');
      expect(value).toContain('Category: containment');
      expect(value).toContain('Impact: Isolate affected hosts');
      expect(value).toContain('Action workflow: workflow-1');
      expect(value).toContain('Action input:');
      expect(value).toContain('endpoint_ids: abc-123');
      expect(value).toContain('force: true');
      expect(value).toContain('- Rotate the compromised key');
    });

    it('surfaces the truncation note when the payload was truncated', async () => {
      const value = await formatToText(attachmentType, formatContext, {
        ...validPayload,
        truncated: true,
        truncated_original_count: 120,
      });

      expect(value).toContain('truncated from 120 original entries');
    });
  });

  describe('getAgentDescription', () => {
    it('documents the payload shape and the render_attachment contract', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('Significant Security Event');
      expect(description).toContain('timeline');
      expect(description).toContain('hypothesis_tested');
      expect(description).toContain('{ field, value }');
      expect(description).toContain('NOT Discover IOCs');
      expect(description).toContain('<render_attachment id="ATTACHMENT_ID" version="VERSION" />');
    });
  });

  describe('max-size payload', () => {
    it('keeps the representation within maxContentLength at the schema max sizes', async () => {
      const maxSizePayload = {
        ...validPayload,
        title: 't'.repeat(512),
        hypothesis_tested: 'h'.repeat(4000),
        security_knowledge_indicators: Array.from({ length: 50 }, () => ({
          type: 'ioc' as const,
          value: 'v'.repeat(2048),
          ioc: { type: 'hash' as const, value: 'h'.repeat(2048) },
        })),
        entities: Array.from({ length: 50 }, () => ({
          field: 'host.name' as const,
          value: 'e'.repeat(2048),
        })),
        alerts: Array.from({ length: 50 }, () => ({
          alert_id: 'a'.repeat(512),
          index: 'i'.repeat(256),
        })),
        events: Array.from({ length: 50 }, () => ({
          event_id: 'e'.repeat(512),
          source_index: 'i'.repeat(256),
        })),
        timeline: Array.from({ length: 50 }, () => ({
          at: '2026-01-01T00:00:00Z',
          what: 'w'.repeat(2000),
        })),
        evidence_for: Array.from({ length: 50 }, () => 'f'.repeat(2000)),
        evidence_against: Array.from({ length: 50 }, () => 'a'.repeat(2000)),
        hunt_result: {
          has_confirmed_hit: true,
          time_range: { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' },
          tier1: {
            status: 'environment_hits_found' as const,
            counts: { total_hits: 1, returned_hits: 1, affected_hosts: 1, affected_users: 1 },
            per_index: Array.from({ length: 20 }, () => ({
              index: 'i'.repeat(256),
              hit_count: 1,
              required: true,
            })),
            resolved_iocs: Array.from({ length: 50 }, () => ({
              type: 'hash' as const,
              value: 'h'.repeat(2048),
            })),
          },
          tier2: {
            status: 'behaviors_proposed' as const,
            behaviors: Array.from({ length: 20 }, () => ({
              technique_id: 't'.repeat(32),
              tactic_ids: Array.from({ length: 20 }, () => 'x'.repeat(32)),
              confidence: 0.9,
              rule_name: 'r'.repeat(256),
            })),
          },
        },
        // `maps_to_proposal` at its schema maximums, including the 32KB `actionInput` cap,
        // since the formatter now emits every one of these fields.
        maps_to_proposal: {
          category: 'c'.repeat(256),
          impact: 'i'.repeat(2000),
          confidence: 1,
          actionWorkflowId: 'w'.repeat(512),
          // 50 keys at the 256-char key cap, with values sized so the serialized payload sits
          // just under the 32768-byte `actionInput` cap (32601 bytes).
          actionInput: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`key-${i}`.padEnd(256, 'k'), 'v'.repeat(390)])
          ),
          manual_remediation: Array.from({ length: 50 }, () => 'm'.repeat(2000)),
        },
      };

      const value = await formatToText(attachmentType, formatContext, maxSizePayload);

      expect(value.length).toBeLessThanOrEqual(attachmentType.maxContentLength ?? Infinity);
    });
  });
});
