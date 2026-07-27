/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
} from '@kbn/agent-builder-server/tools';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import { ToolResultType } from '@kbn/agent-builder-common';
import {
  ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

const mockEsqlQuery = jest.fn();
const mockContext = {
  esClient: { asCurrentUser: { esql: { query: mockEsqlQuery } } },
} as unknown as ToolHandlerContext;

async function getExtractIocsTool(): Promise<BuiltinSkillBoundedTool> {
  const inlineTools = await endpointForensicAnalysisSkill.getInlineTools?.();
  const tool = inlineTools?.find((t) => t.id === ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID);
  if (!tool || !('handler' in tool)) {
    throw new Error(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} not found in inline tools`);
  }
  return tool;
}

async function runExtractIocs(tool: BuiltinSkillBoundedTool) {
  const toolReturn = await tool.handler(
    { hosts: ['WKSTN-RECV01'], time_window_hours: 72 },
    mockContext
  );
  if (!isToolHandlerStandardReturn(toolReturn)) {
    throw new Error('extract_iocs did not return a standard tool result');
  }
  return toolReturn.results;
}

describe('extract_iocs osquery live-state guidance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsqlQuery.mockResolvedValue({ columns: [], values: [] });
  });

  it('returns all seven osquery_*_guidance blocks alongside the ES|QL-derived iocs', async () => {
    const tool = await getExtractIocsTool();
    const results = await runExtractIocs(tool);

    expect(results).toHaveLength(1);
    const [{ type, data }] = results as Array<{ type: string; data: Record<string, unknown> }>;
    expect(type).toBe(ToolResultType.other);

    for (const key of [
      'osquery_mutex_guidance',
      'osquery_processes_guidance',
      'osquery_network_guidance',
      'osquery_persistence_guidance',
      'osquery_wmi_persistence_guidance',
      'osquery_execution_history_guidance',
      'osquery_logged_in_users_guidance',
    ]) {
      expect(data).toHaveProperty(key);
      const block = data[key] as Record<string, unknown>;
      expect(typeof block.query).toBe('string');
      expect(block.required_tool).toBe('osquery.run_live_query');
      expect(typeof block.availability_gate).toBe('string');
    }
  });

  it('only references osquery tables present in the real v5.19.0 schema catalog', async () => {
    const tool = await getExtractIocsTool();
    const results = await runExtractIocs(tool);
    const data = results[0].data as Record<string, unknown>;

    const realTables = [
      'winbaseobj',
      'processes',
      'process_open_sockets',
      'scheduled_tasks',
      'services',
      'wmi_cli_event_consumers',
      'wmi_event_filters',
      'shimcache',
      'prefetch',
      'logged_in_users',
    ];
    const guidanceKeys = [
      'osquery_mutex_guidance',
      'osquery_processes_guidance',
      'osquery_network_guidance',
      'osquery_persistence_guidance',
      'osquery_wmi_persistence_guidance',
      'osquery_execution_history_guidance',
      'osquery_logged_in_users_guidance',
    ];
    for (const key of guidanceKeys) {
      const block = data[key] as { query: string; secondary_query?: string };
      const referencedTables = [block.query, block.secondary_query]
        .filter((q): q is string => Boolean(q))
        .join(' ');
      const matchesKnownTable = realTables.some((table) =>
        new RegExp(`FROM\\s+${table}\\b`, 'i').test(referencedTables)
      );
      expect(matchesKnownTable).toBe(true);
    }
  });

  it('persistence guidance covers both scheduled_tasks and services (two independent vectors)', async () => {
    const tool = await getExtractIocsTool();
    const results = await runExtractIocs(tool);
    const data = results[0].data as Record<string, unknown>;
    const persistence = data.osquery_persistence_guidance as {
      query: string;
      secondary_query: string;
    };

    expect(persistence.query).toMatch(/FROM scheduled_tasks/i);
    expect(persistence.secondary_query).toMatch(/FROM services/i);
  });

  it('wmi persistence guidance covers both event consumers and event filters', async () => {
    const tool = await getExtractIocsTool();
    const results = await runExtractIocs(tool);
    const data = results[0].data as Record<string, unknown>;
    const wmi = data.osquery_wmi_persistence_guidance as {
      query: string;
      secondary_query: string;
    };

    expect(wmi.query).toMatch(/FROM wmi_cli_event_consumers/i);
    expect(wmi.secondary_query).toMatch(/FROM wmi_event_filters/i);
  });

  it('execution history guidance covers both shimcache and prefetch', async () => {
    const tool = await getExtractIocsTool();
    const results = await runExtractIocs(tool);
    const data = results[0].data as Record<string, unknown>;
    const execHistory = data.osquery_execution_history_guidance as {
      query: string;
      secondary_query: string;
    };

    expect(execHistory.query).toMatch(/FROM shimcache/i);
    expect(execHistory.secondary_query).toMatch(/FROM prefetch/i);
  });

  it('network guidance excludes the GCP metadata server and classifies the IAP range', async () => {
    const tool = await getExtractIocsTool();
    const results = await runExtractIocs(tool);
    const data = results[0].data as Record<string, unknown>;
    const network = data.osquery_network_guidance as {
      query: string;
      gcp_noise_classification: string;
    };

    expect(network.query).toContain('169.254.169.254');
    expect(network.gcp_noise_classification).toMatch(/35\.235\.240\.0\/20/);
  });
});
