/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AESOP_DRIFT_MONITOR_WORKFLOW_ID } from '@kbn/workflows/managed';
import { loggerMock } from '@kbn/logging-mocks';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
} from '@kbn/management-settings-ids';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { SecurityManagedWorkflowsClient } from '../workflows/managed_workflows';
import {
  aesopDriftMonitorDocumentId,
  aesopDriftMonitorWorkflowIdSuffix,
  buildTemplateValues,
  enableAesopDriftMonitor,
  getAesopDriftMonitorTracingWarnings,
  uninstallAesopDriftMonitor,
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

type LegacyOwners = Partial<Record<string, string>> | 'reject';

const createClient = (legacyOwners: LegacyOwners = {}) => {
  const uninstall = jest.fn().mockResolvedValue(undefined);
  const getInstalledWorkflowState = jest.fn(async (_workflowId: string, spaceId: string) => {
    if (legacyOwners === 'reject') throw new Error('workflows plugin is not available');
    const owner = legacyOwners[spaceId];
    return owner ? { templateValues: { skillId: owner } } : null;
  });
  const client = {
    install: jest.fn().mockResolvedValue(undefined),
    uninstall,
    getInstalledWorkflowState,
  } as unknown as SecurityManagedWorkflowsClient;
  return { client, uninstall };
};

describe('uninstallAesopDriftMonitor', () => {
  const uninstall = async (skillId: string, legacyOwners?: LegacyOwners) => {
    const { client, uninstall: uninstallMock } = createClient(legacyOwners);
    await uninstallAesopDriftMonitor(
      {
        getManagedWorkflowsClient: async () => client,
        logger: loggerMock.create(),
        spaceId: 'default',
      },
      { skillId }
    );
    return uninstallMock.mock.calls.map(([, options]) => options);
  };

  it('removes the legacy instance when it belongs to the same skill', async () => {
    await expect(uninstall('Find.Rules', { default: 'Find.Rules' })).resolves.toEqual([
      { spaceId: 'default', workflowIdSuffix: aesopDriftMonitorWorkflowIdSuffix('Find.Rules') },
      { spaceId: 'default', workflowIdSuffix: 'skill-find-rules' },
    ]);
  });

  it('removes a legacy instance left in the global space', async () => {
    await expect(
      uninstall('Find.Rules', { [GLOBAL_WORKFLOW_SPACE_ID]: 'Find.Rules' })
    ).resolves.toEqual([
      { spaceId: 'default', workflowIdSuffix: aesopDriftMonitorWorkflowIdSuffix('Find.Rules') },
      { spaceId: GLOBAL_WORKFLOW_SPACE_ID, workflowIdSuffix: 'skill-find-rules' },
    ]);
  });

  it.each([
    ['another skill', { default: 'foo-bar', [GLOBAL_WORKFLOW_SPACE_ID]: 'foo-bar' }],
    ['no skill', {}],
  ])('keeps a legacy instance owned by %s', async (_label, legacyOwners) => {
    await expect(uninstall('foo_bar', legacyOwners)).resolves.toEqual([
      { spaceId: 'default', workflowIdSuffix: aesopDriftMonitorWorkflowIdSuffix('foo_bar') },
    ]);
  });

  it('skips the legacy instance when the id has no slug', async () => {
    await expect(uninstall('...')).resolves.toEqual([
      { spaceId: 'default', workflowIdSuffix: aesopDriftMonitorWorkflowIdSuffix('...') },
    ]);
  });

  it('still removes the current monitor when the legacy lookup fails', async () => {
    await expect(uninstall('foo_bar', 'reject')).resolves.toEqual([
      { spaceId: 'default', workflowIdSuffix: aesopDriftMonitorWorkflowIdSuffix('foo_bar') },
    ]);
  });
});

describe('enableAesopDriftMonitor', () => {
  const enable = async (legacyOwners: LegacyOwners) => {
    const { client, uninstall } = createClient(legacyOwners);
    const updateWorkflow = jest.fn().mockResolvedValue(undefined);
    await enableAesopDriftMonitor(
      {
        getManagedWorkflowsClient: async () => client,
        workflowsManagement: { updateWorkflow },
        logger: loggerMock.create(),
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'default',
      },
      { skillId: 'foo_bar' }
    );
    expect(updateWorkflow).toHaveBeenCalledWith(
      aesopDriftMonitorDocumentId('foo_bar'),
      { enabled: true },
      'default',
      expect.anything()
    );
    return uninstall.mock.calls.map(([, options]) => options);
  };

  it.each([
    ['in the request space', 'default'],
    ['in the global space', GLOBAL_WORKFLOW_SPACE_ID],
  ])('removes a legacy instance of the same skill %s', async (_label, spaceId) => {
    await expect(enable({ [spaceId]: 'foo_bar' })).resolves.toEqual([
      { spaceId, workflowIdSuffix: 'skill-foo-bar' },
    ]);
  });

  it('keeps a legacy instance of another skill', async () => {
    await expect(
      enable({ default: 'foo-bar', [GLOBAL_WORKFLOW_SPACE_ID]: 'foo-bar' })
    ).resolves.toEqual([]);
  });

  it('still enables the monitor when the legacy lookup fails', async () => {
    await expect(enable('reject')).resolves.toEqual([]);
  });
});
