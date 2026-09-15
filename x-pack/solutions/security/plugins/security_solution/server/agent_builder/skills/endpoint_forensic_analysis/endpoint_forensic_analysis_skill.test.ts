/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { investigationIocsAttachmentDataSchema } from '../../attachments/investigation_iocs';
import {
  ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
  ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
  endpointForensicAnalysisSkill,
} from './endpoint_forensic_analysis_skill';

describe('endpointForensicAnalysisSkill', () => {
  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID)).toBe(true);
  });

  it('exposes ES|QL and index discovery platform registry tools only (read-only scope)', () => {
    const registryTools = endpointForensicAnalysisSkill.getRegistryTools?.() ?? [];
    expect(registryTools).toEqual([
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ]);
  });

  it('defines the telemetry discovery and IoC extraction inline tools', async () => {
    const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
    expect(inlineTools.map(({ id }) => id)).toEqual([
      ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID,
      ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID,
    ]);
  });

  describe(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} handler`, () => {
    const esqlQuery = jest.fn();
    const context = {
      esClient: { asCurrentUser: { esql: { query: esqlQuery } } },
    } as never;

    const runHandler = async (hosts: string[] = ['win-server-1']) => {
      const inlineTools = (await endpointForensicAnalysisSkill.getInlineTools?.()) ?? [];
      const tool = inlineTools.find(({ id }) => id === ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID);
      if (tool?.type !== ToolType.builtin) {
        throw new Error(`${ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID} is not a builtin inline tool`);
      }
      const { results } = (await tool.handler({ hosts }, context)) as ToolHandlerStandardReturn;
      return results[0].data as Record<string, unknown> & { error?: string; guidance: string };
    };

    beforeEach(() => {
      esqlQuery.mockReset();
    });

    it('groups indicators into the categories the IoC attachment accepts', async () => {
      esqlQuery.mockResolvedValue({
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

      const data = await runHandler();

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
      esqlQuery.mockResolvedValue({
        columns: [
          { name: 'file.path' },
          { name: 'process.command_line' },
          { name: 'event.action' },
        ],
        values: [
          [
            'C:\\Users\\Public\\Desktop\\README_RESTORE.txt',
            'vssadmin delete shadows /all /quiet',
            'creation',
          ],
        ],
      });

      const data = await runHandler();

      expect(investigationIocsAttachmentDataSchema.safeParse(data).success).toBe(true);
      expect(data.file_paths).toEqual([
        { value: 'C:\\Users\\Public\\Desktop\\README_RESTORE.txt', comment: 'File creation' },
      ]);
      expect(data.malicious_commands).toEqual([
        { value: 'vssadmin delete shadows /all /quiet', comment: 'Run' },
      ]);
    });

    it('leaves the categories only the agent can fill to the agent', async () => {
      esqlQuery.mockResolvedValue({
        columns: [{ name: 'destination.ip' }],
        values: [['203.0.113.10']],
      });

      const data = await runHandler();

      expect(data.ransom_note).toBeUndefined();
      expect(data.encryption_marker).toBeUndefined();
      expect(data.compromised_identities).toBeUndefined();
      expect(data.guidance).toContain('ransom_note');
    });

    it('sorts ascending before limiting so each comment describes the earliest occurrence', async () => {
      esqlQuery.mockResolvedValue({ columns: [], values: [] });

      await runHandler();

      const { query } = esqlQuery.mock.calls[0][0];
      expect(query.indexOf('SORT @timestamp ASC')).toBeLessThan(query.indexOf('LIMIT'));
    });

    it('keeps the earliest row for an indicator seen more than once', async () => {
      esqlQuery.mockResolvedValue({
        columns: [{ name: 'destination.ip' }, { name: 'host.name' }],
        values: [
          ['203.0.113.10', 'WKSTN-RECV01'],
          ['203.0.113.10', 'SRV-DC01'],
        ],
      });

      const data = await runHandler();

      expect(data.ips).toEqual([
        { value: '203.0.113.10', comment: 'Outbound destination contacted on WKSTN-RECV01' },
      ]);
    });

    it('reports the query failure so missing categories are not read as "no indicators"', async () => {
      esqlQuery.mockRejectedValue(new Error('index_not_found_exception'));

      const data = await runHandler();

      expect(data.shas).toBeUndefined();
      expect(data.error).toContain('index_not_found_exception');
      expect(data.guidance).toContain('not because');
      expect(investigationIocsAttachmentDataSchema.safeParse(data).success).toBe(true);
    });

    it('omits the error field on a successful query', async () => {
      esqlQuery.mockResolvedValue({ columns: [], values: [] });

      const data = await runHandler();

      expect(data.error).toBeUndefined();
    });
  });

  it('routes conflicting antivirus / configuration issues to elastic-defend-configuration-troubleshooting', () => {
    expect(endpointForensicAnalysisSkill.description).toContain('antivirus');
    expect(endpointForensicAnalysisSkill.description).toContain(
      'elastic-defend-configuration-troubleshooting'
    );
    expect(endpointForensicAnalysisSkill.content).toContain(
      'Conflicting or incompatible security software'
    );
    expect(endpointForensicAnalysisSkill.content).toContain('antivirus');
    expect(endpointForensicAnalysisSkill.content).toContain('Naming a specific host does');
    expect(endpointForensicAnalysisSkill.content).toContain(
      'elastic-defend-configuration-troubleshooting'
    );
  });
});
