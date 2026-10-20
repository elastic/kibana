/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
} from '@kbn/agent-builder-server/tools';
import { investigationIocsAttachmentDataSchema } from '../../attachments/investigation_iocs';
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
  const tool = inlineTools?.find(
    (candidate) => candidate.id === ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID
  );
  if (tool?.type !== ToolType.builtin) {
    throw new Error(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} is not a builtin inline tool`);
  }
  return tool;
}

async function runExtractIocs(hosts: string[] = ['WKSTN-RECV01'], timeWindowHours?: number) {
  const tool = await getExtractIocsTool();
  const toolReturn = await tool.handler(
    { hosts, ...(timeWindowHours !== undefined ? { time_window_hours: timeWindowHours } : {}) },
    mockContext
  );
  if (!isToolHandlerStandardReturn(toolReturn)) {
    throw new Error('extract_iocs did not return a standard tool result');
  }
  return toolReturn.results;
}

const getData = async (hosts?: string[]) => {
  const results = await runExtractIocs(hosts);
  return results[0].data as Record<string, unknown> & { error?: string; guidance: string };
};

describe(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} handler`, () => {
  beforeEach(() => {
    mockEsqlQuery.mockReset();
    mockEsqlQuery.mockResolvedValue({ columns: [], values: [] });
  });

  it('returns a single other-typed result alongside the ES|QL-derived iocs', async () => {
    const results = await runExtractIocs();

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe(ToolResultType.other);
  });

  it('scopes the ES|QL query to the named hosts, lookback window, and drop_null_columns', async () => {
    await runExtractIocs(['WKSTN-RECV01', 'SRV-DC01'], 24);

    expect(mockEsqlQuery).toHaveBeenCalledWith({
      query: expect.stringContaining('host.name IN ("WKSTN-RECV01", "SRV-DC01")'),
      drop_null_columns: true,
    });
    expect(mockEsqlQuery.mock.calls[0][0].query).toContain('NOW() - 24 HOURS');
  });

  it('does not attach osquery live-state guidance — Defend telemetry only', async () => {
    const data = await getData();

    expect(Object.keys(data).filter((key) => key.startsWith('osquery_'))).toEqual([]);
  });

  it('groups indicators into the categories the IoC attachment accepts', async () => {
    mockEsqlQuery.mockResolvedValue({
      columns: [
        { name: 'process.hash.sha256' },
        { name: 'process.executable' },
        { name: 'destination.domain' },
        { name: 'registry.path' },
        { name: 'event.action' },
        { name: 'host.name' },
      ],
      values: [
        [
          'abc123',
          'C:\\Users\\Public\\update.dll',
          'evil.example',
          'HKLM\\Run\\evil',
          'start',
          'WKSTN-RECV01',
        ],
      ],
    });

    const data = await getData();

    expect(investigationIocsAttachmentDataSchema.safeParse(data).success).toBe(true);
    expect(data.shas).toEqual([
      { value: 'abc123', comment: 'SHA256 of C:\\Users\\Public\\update.dll on WKSTN-RECV01' },
    ]);
    expect(data.ips).toEqual([
      {
        value: 'evil.example',
        comment: 'Domain resolved and contacted on WKSTN-RECV01 by C:\\Users\\Public\\update.dll',
      },
    ]);
    expect(data.file_paths).toEqual([
      { value: 'C:\\Users\\Public\\update.dll', comment: 'Executable on WKSTN-RECV01' },
      { value: 'HKLM\\Run\\evil', comment: 'Registry key written on WKSTN-RECV01' },
    ]);
    expect(data.affected_hosts).toEqual([
      { value: 'WKSTN-RECV01', comment: 'Telemetry matched the investigation scope' },
    ]);
  });

  it('routes command lines to malicious_commands rather than the file path category', async () => {
    mockEsqlQuery.mockResolvedValue({
      columns: [{ name: 'file.path' }, { name: 'process.command_line' }, { name: 'event.action' }],
      values: [
        [
          'C:\\Users\\Public\\Desktop\\README_RESTORE.txt',
          'vssadmin delete shadows /all /quiet',
          'creation',
        ],
      ],
    });

    const data = await getData();

    expect(investigationIocsAttachmentDataSchema.safeParse(data).success).toBe(true);
    expect(data.file_paths).toEqual([
      { value: 'C:\\Users\\Public\\Desktop\\README_RESTORE.txt', comment: 'File creation' },
    ]);
    expect(data.malicious_commands).toEqual([
      { value: 'vssadmin delete shadows /all /quiet', comment: 'Run' },
    ]);
  });

  it('leaves the categories only the agent can fill to the agent', async () => {
    mockEsqlQuery.mockResolvedValue({
      columns: [{ name: 'destination.ip' }],
      values: [['203.0.113.10']],
    });

    const data = await getData();

    expect(data.ransom_note).toBeUndefined();
    expect(data.encryption_marker).toBeUndefined();
    expect(data.compromised_identities).toBeUndefined();
    expect(data.guidance).toContain('ransom_note');
  });

  it('sorts ascending before limiting so each comment describes the earliest occurrence', async () => {
    await runExtractIocs();

    const { query } = mockEsqlQuery.mock.calls[0][0];
    expect(query.indexOf('SORT @timestamp ASC')).toBeLessThan(query.indexOf('LIMIT'));
  });

  it('keeps the earliest row for an indicator seen more than once', async () => {
    mockEsqlQuery.mockResolvedValue({
      columns: [{ name: 'destination.ip' }, { name: 'host.name' }],
      values: [
        ['203.0.113.10', 'WKSTN-RECV01'],
        ['203.0.113.10', 'SRV-DC01'],
      ],
    });

    const data = await getData();

    expect(data.ips).toEqual([
      { value: '203.0.113.10', comment: 'Outbound destination contacted on WKSTN-RECV01' },
    ]);
  });

  it('reports the query failure so missing categories are not read as "no indicators"', async () => {
    mockEsqlQuery.mockRejectedValue(new Error('index_not_found_exception'));

    const data = await getData();

    expect(data.shas).toBeUndefined();
    expect(data.error).toContain('index_not_found_exception');
    expect(data.guidance).toContain('not because');
    expect(investigationIocsAttachmentDataSchema.safeParse(data).success).toBe(true);
  });

  it('omits the error field on a successful query', async () => {
    const data = await getData();

    expect(data.error).toBeUndefined();
  });
});
