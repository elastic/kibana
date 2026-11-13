/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AESOP_DRIFT_MONITOR_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
} from '@kbn/management-settings-ids';
import {
  aesopDriftMonitorDocumentId,
  aesopDriftMonitorWorkflowIdSuffix,
  buildTemplateValues,
  getAesopDriftMonitorTracingWarnings,
} from './drift_monitor_schedule';

describe('aesopDriftMonitorWorkflowIdSuffix', () => {
  it('keeps a readable slug of the skill id', () => {
    expect(aesopDriftMonitorWorkflowIdSuffix('Find-Security-Rules')).toMatch(
      /^skill-find-security-rules-[0-9a-f]{12}$/
    );
  });

  it('is deterministic across calls', () => {
    expect(aesopDriftMonitorWorkflowIdSuffix('!!!')).toBe(aesopDriftMonitorWorkflowIdSuffix('!!!'));
    expect(aesopDriftMonitorDocumentId('triage')).toBe(
      `${AESOP_DRIFT_MONITOR_WORKFLOW_ID}-${aesopDriftMonitorWorkflowIdSuffix('triage')}`
    );
  });

  it('falls back to the hash alone for a punctuation-only skill id', () => {
    expect(aesopDriftMonitorWorkflowIdSuffix('...')).toMatch(/^skill-[0-9a-f]{12}$/);
  });

  it('keeps skill ids that slug identically on distinct suffixes', () => {
    const suffixes = new Set(
      ['Foo.Bar', 'foo-bar', 'foo_bar', `${'a'.repeat(60)}-one`, `${'a'.repeat(60)}-two`].map(
        aesopDriftMonitorWorkflowIdSuffix
      )
    );
    expect(suffixes.size).toBe(5);
  });

  it('bounds the suffix length for long skill ids', () => {
    expect(aesopDriftMonitorWorkflowIdSuffix('x'.repeat(500)).length).toBeLessThanOrEqual(
      'skill-'.length + 48 + 1 + 12
    );
  });
});

describe('buildTemplateValues', () => {
  it('passes the resolved skill name through', () => {
    expect(buildTemplateValues({ skillId: 'triage', skillName: 'Alert triage' })).toEqual(
      expect.objectContaining({ skillId: 'triage', skillName: 'Alert triage' })
    );
  });

  it('falls back to the skill id when the name is unknown', () => {
    expect(buildTemplateValues({ skillId: 'triage' }).skillName).toBe('triage');
  });

  it('falls back to the skill id when the name would break the rendered YAML or ES|QL', () => {
    expect(
      buildTemplateValues({ skillId: 'triage', skillName: `Alert's "triage"` }).skillName
    ).toBe('triage');
  });

  it('rejects a skill id that cannot be rendered safely', () => {
    expect(() => buildTemplateValues({ skillId: `x' OR "1"` })).toThrow(/Invalid skill id/);
  });

  it.each(['Find-Security-Rules', 'foo.bar', '-triage', 'a'.repeat(65)])(
    'rejects %j, which Agent Builder would not accept as a skill id',
    (skillId) => {
      expect(() => buildTemplateValues({ skillId })).toThrow(/Invalid skill id/);
    }
  );

  it('accepts an id at the Agent Builder length limit', () => {
    expect(buildTemplateValues({ skillId: 'a'.repeat(64) }).skillId).toBe('a'.repeat(64));
  });
});

describe('getAesopDriftMonitorTracingWarnings', () => {
  const withSettings =
    (values: Record<string, boolean | undefined>) =>
    async (settingId: string): Promise<boolean> =>
      Boolean(values[settingId]);

  it('returns no warnings when tracing and tool details are on', async () => {
    await expect(
      getAesopDriftMonitorTracingWarnings(
        withSettings({
          [AGENT_BUILDER_TRACING_ENABLED_SETTING_ID]: true,
          [AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID]: true,
        })
      )
    ).resolves.toEqual([]);
  });

  it('warns when tool details are excluded from traces', async () => {
    const warnings = await getAesopDriftMonitorTracingWarnings(
      withSettings({ [AGENT_BUILDER_TRACING_ENABLED_SETTING_ID]: true })
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID);
  });

  it('warns about both settings when tracing is off', async () => {
    await expect(getAesopDriftMonitorTracingWarnings(withSettings({}))).resolves.toHaveLength(2);
  });
});
