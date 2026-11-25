/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildParityPassthroughAlert,
  CHRYSALIS_PASSTHROUGH_RULE,
  inlineParityAttachment,
  resolveParityInlineAttachment,
  toPythonJson,
} from './chrysalis_parity_attachments';
import { seedDocId } from './chrysalis_seed';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');

describe('chrysalis_parity_attachments', () => {
  describe('buildParityPassthroughAlert', () => {
    const alert = buildParityPassthroughAlert(NOW);

    it('wraps the DNS-beacon simulator alert as the passthrough rule', () => {
      expect(alert).toMatchObject({
        'kibana.alert.rule.name': 'Chrysalis Sim Passthrough',
        'kibana.alert.rule.uuid': CHRYSALIS_PASSTHROUGH_RULE.id,
        'kibana.alert.rule.rule_id': 'chrysalis-sim-passthrough',
        'kibana.alert.risk_score': 73,
        'kibana.alert.severity': 'high',
        'kibana.alert.depth': 2,
        'event.kind': 'signal',
        'kibana.alert.original_event.kind': 'signal',
        'kibana.alert.original_event.category': ['intrusion_detection'],
        dns: { question: { name: 'api.skycloudcenter.com', type: 'A' } },
        host: expect.objectContaining({ name: 'srv-win-defend-01' }),
        process: { name: 'BluetoothService.exe', pid: 6201 },
        'kibana.alert.reason':
          'intrusion_detection event with process BluetoothService.exe, by SYSTEM on srv-win-defend-01 created high alert Chrysalis Sim Passthrough.',
      });
      expect(alert).not.toHaveProperty('kibana');
      expect(alert).not.toHaveProperty('signal');
      expect(alert.event).not.toHaveProperty('kind');
    });

    it('chains the simulator alert onto its ancestry', () => {
      expect(alert['kibana.alert.ancestors']).toEqual([
        {
          depth: 0,
          id: '3490dc9f-f157-47ae-adfe-e8aa6f9bc7c3',
          index: 'logs-endpoint.events.process-default',
          type: 'event',
        },
        {
          // The seed ids sim alerts by file order in PARITY_DOCS, not by timestamp.
          id: seedDocId('logs-chrysalis-sim.alerts-default', 4),
          type: 'signal',
          index: 'logs-chrysalis-sim.alerts-default',
          depth: 1,
          rule: 'e8abe0dc-2232-5eff-8436-8ee3a76d8ea2',
        },
      ]);
    });

    it('shifts timestamps like the seeded corpus, keeping the beacon 37 minutes before the newest doc', () => {
      const expected = new Date(NOW - 37 * 60_000).toISOString();
      expect(alert['@timestamp']).toBe(expected);
      expect(alert['kibana.alert.original_time']).toBe(expected);
    });
  });

  describe('resolveParityInlineAttachment', () => {
    it('returns nothing for the default agent', () => {
      expect(resolveParityInlineAttachment('alert-analysis-a', 'default')).toBeUndefined();
      expect(resolveParityInlineAttachment('detection-rule-edit-b', 'default')).toBeUndefined();
    });

    it('attaches the alert or rule the benchmark attached', () => {
      expect(resolveParityInlineAttachment('alert-analysis-a', 'chrysalis-parity', NOW)?.kind).toBe(
        'alert'
      );
      expect(resolveParityInlineAttachment('multi-step-a', 'chrysalis-parity', NOW)?.kind).toBe(
        'alert'
      );
      for (const id of [
        'detection-rule-edit-a',
        'detection-rule-edit-b',
        'detection-rule-edit-c',
      ]) {
        expect(resolveParityInlineAttachment(id, 'chrysalis-parity')).toEqual({
          kind: 'rule',
          data: CHRYSALIS_PASSTHROUGH_RULE,
        });
      }
      expect(resolveParityInlineAttachment('alert-analysis-b', 'chrysalis-parity')).toBeUndefined();
      expect(resolveParityInlineAttachment(undefined, 'chrysalis-parity')).toBeUndefined();
    });
  });

  describe('inlining', () => {
    it("serializes like Python's json.dumps(ensure_ascii=False)", () => {
      expect(toPythonJson({ a: [1, 'x—y'], b: { c: null, d: true }, e: undefined })).toBe(
        '{"a": [1, "x—y"], "b": {"c": null, "d": true}}'
      );
    });

    it('appends the JSON under the header the benchmark used for every attachment', () => {
      expect(inlineParityAttachment('Q?', { a: 1 })).toBe(
        'Q?\n\n--- Attached alert (most recent) ---\n{"a": 1}'
      );
    });
  });
});
