/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Drift-guard: ensures the `securityAlertAnalysisCallerAlerts` entry in the built-in
 * workflow input definitions registry stays in sync with the canonical Zod types
 * (`AlertAnalysisCallerAlertItem`).
 *
 * The `Record<keyof T, true>` map produces a **compile error** if a field is
 * added or removed from the Zod-inferred type, making both the type and the schema
 * check mandatory on any caller-alert shape change.
 */

import {
  SECURITY_ALERT_ANALYSIS_CALLER_ALERTS_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
} from '@kbn/workflows';
import type { AlertAnalysisCallerAlertItem } from './alert_analysis_workflow';
import {
  ALERT_ANALYSIS_CALLER_ALERT_INDEX_PATTERN,
  AlertAnalysisCallerAlerts,
} from './alert_analysis_workflow';

// Keyed on `.shape`: the loose object's inferred type has a string index signature, so
// `keyof AlertAnalysisCallerAlertItem` would accept any key and never fail to compile.
const _alertItemKeyGuard: Record<keyof typeof AlertAnalysisCallerAlertItem.shape, true> = {
  _id: true,
  _index: true,
  '@timestamp': true,
  kibana: true,
};

describe('securityAlertAnalysisCallerAlerts builtin workflow input definition', () => {
  const schema =
    builtinWorkflowInputDefinitions[SECURITY_ALERT_ANALYSIS_CALLER_ALERTS_INPUT_DEFINITION_ID];

  it('is registered under the expected id as an array', () => {
    expect(schema).toBeDefined();
    expect(schema.type).toBe('array');
    expect(schema.maxItems).toBe(1000);
  });

  it('exposes exactly the AlertAnalysisCallerAlertItem top-level fields on items', () => {
    const items = schema.items as { properties?: Record<string, unknown> };
    const schemaFields = Object.keys(items?.properties ?? {}).sort();
    const typeFields = Object.keys(_alertItemKeyGuard).sort();
    expect(schemaFields).toEqual(typeFields);
  });

  it('requires the Worker-path fields on each alert item', () => {
    const items = schema.items as { required?: string[] };
    expect(items?.required).toEqual(
      expect.arrayContaining(['_id', '_index', '@timestamp', 'kibana'])
    );
  });

  it('constrains _index to Security alerts alias/backing indexes', () => {
    const items = schema.items as {
      properties?: { _index?: { pattern?: string; maxLength?: number } };
    };
    expect(items?.properties?._index?.maxLength).toBe(512);
    expect(items?.properties?._index?.pattern).toBe(
      ALERT_ANALYSIS_CALLER_ALERT_INDEX_PATTERN.source
    );
  });

  it('requires @timestamp as date-time for enrichment anchors', () => {
    const items = schema.items as {
      properties?: { '@timestamp'?: { format?: string; maxLength?: number } };
    };
    expect(items?.properties?.['@timestamp']?.format).toBe('date-time');
    expect(items?.properties?.['@timestamp']?.maxLength).toBe(64);
  });
});

describe('AlertAnalysisCallerAlerts', () => {
  const alert = {
    _id: 'alert-1',
    _index: '.internal.alerts-security.alerts-default-000001',
    '@timestamp': '2026-09-23T10:00:00.000Z',
    host: { name: 'host-1' },
    user: { name: 'user-1' },
    process: { command_line: 'cmd.exe /c whoami' },
    kibana: {
      alert: {
        workflow_tags: ['ai.classification.true_positive'],
        severity: 'high',
        rule: { uuid: 'rule-1', name: 'Rule 1', rule_type_id: 'siem.queryRule' },
      },
    },
  };

  it('keeps the full alert document, including nested kibana.alert fields', () => {
    expect(AlertAnalysisCallerAlerts.parse([alert])).toEqual([alert]);
  });

  it.each(['not-a-date', '2026-09-23', '2026-09-23T12:00:00.000+02:00'])(
    'rejects a non-UTC date-time @timestamp (%s), matching execution-time validation',
    (timestamp) => {
      const result = AlertAnalysisCallerAlerts.safeParse([{ ...alert, '@timestamp': timestamp }]);
      expect(result.success).toBe(false);
    }
  );
});
