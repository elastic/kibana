/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../../__mocks__/test_helpers';
import { threatIntelEnrichTool } from '../threat_intel_enrich_tool';
import { caseManageTool } from '../case_manage_tool';
import { reportGenerateTool } from '../report_generate_tool';
import { entityStoreQueryTool } from '../entity_store_query_tool';

/**
 * Integration tests for SOC agent builder tools.
 *
 * These tests exercise each tool with more realistic mock setups,
 * validating multi-step interactions and cross-cutting concerns
 * that unit tests do not cover (e.g. multiple sequential calls,
 * realistic ES response shapes, multi-action case workflows).
 *
 * Run with: yarn test:jest_integration --config x-pack/solutions/security/plugins/security_solution/server/jest.integration.config.js server/agent_builder/tools/__integration__/soc_tools.integration.test.ts
 */

describe('SOC Tools Integration', () => {
  describe('threat_intel_enrich_tool', () => {
    const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
    const tool = threatIntelEnrichTool(mockCore, mockLogger);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('enriches an IP against multiple TI sources and returns consolidated results', async () => {
      const mockTiHits = [
        {
          _id: 'ti-1',
          _index: '.ds-logs-ti_abusech-default',
          _source: {
            '@timestamp': '2024-01-15T10:00:00Z',
            threat: {
              indicator: {
                type: 'ipv4-addr',
                ip: '185.220.101.42',
                provider: 'AbuseCH',
                confidence: 'High',
                description: 'Known C2 server for Cobalt Strike',
                first_seen: '2023-12-01T00:00:00Z',
                last_seen: '2024-01-15T00:00:00Z',
              },
              feed: { name: 'AbuseCH' },
            },
          },
        },
        {
          _id: 'ti-2',
          _index: '.ds-logs-ti_otx-default',
          _source: {
            '@timestamp': '2024-01-14T08:00:00Z',
            threat: {
              indicator: {
                type: 'ipv4-addr',
                ip: '185.220.101.42',
                provider: 'AlienVault OTX',
                confidence: 'Medium',
                description: 'Associated with APT29 infrastructure',
                first_seen: '2023-11-15T00:00:00Z',
                last_seen: '2024-01-14T00:00:00Z',
              },
              feed: { name: 'AlienVault OTX' },
            },
          },
        },
        {
          _id: 'ti-3',
          _index: '.ds-logs-ti_anomali-default',
          _source: {
            '@timestamp': '2024-01-13T12:00:00Z',
            threat: {
              indicator: {
                type: 'ipv4-addr',
                ip: '185.220.101.42',
                provider: 'Anomali',
                confidence: 'High',
                description: 'Tor exit node associated with malware distribution',
                first_seen: '2023-10-01T00:00:00Z',
                last_seen: '2024-01-13T00:00:00Z',
              },
              feed: { name: 'Anomali' },
            },
          },
        },
      ];

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: mockTiHits,
          total: { value: 3, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { ioc_type: 'ip', ioc_value: '185.220.101.42' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          ioc_type: 'ip',
          ioc_value: '185.220.101.42',
          match_count: 3,
          total_matches: 3,
        })
      );
      expect(result.results[0].data.matches).toHaveLength(3);

      // Verify matches come from different sources
      const providers = (result.results[0].data.matches as Array<Record<string, unknown>>).map(
        (m) => m.provider
      );
      expect(providers).toContain('AbuseCH');
      expect(providers).toContain('AlienVault OTX');
      expect(providers).toContain('Anomali');
    });

    it('handles sequential lookups for IP then domain in the same investigation', async () => {
      // First lookup: IP
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'ti-ip-1',
              _index: '.ds-logs-ti_abusech-default',
              _source: {
                '@timestamp': '2024-01-15T10:00:00Z',
                threat: {
                  indicator: {
                    type: 'ipv4-addr',
                    ip: '198.51.100.10',
                    provider: 'AbuseCH',
                    confidence: 'High',
                    description: 'Known malware C2',
                    first_seen: '2024-01-01T00:00:00Z',
                    last_seen: '2024-01-15T00:00:00Z',
                  },
                  feed: { name: 'AbuseCH' },
                },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      // Second lookup: domain
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'ti-domain-1',
              _index: '.ds-logs-ti_abusech-default',
              _source: {
                '@timestamp': '2024-01-15T09:00:00Z',
                threat: {
                  indicator: {
                    type: 'domain-name',
                    url: { domain: 'c2-relay.malware-infra.net' },
                    provider: 'AbuseCH',
                    confidence: 'High',
                    description: 'Known C2 domain',
                    first_seen: '2024-01-01T00:00:00Z',
                    last_seen: '2024-01-15T00:00:00Z',
                  },
                  feed: { name: 'AbuseCH' },
                },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      const ipResult = (await tool.handler(
        { ioc_type: 'ip', ioc_value: '198.51.100.10' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const domainResult = (await tool.handler(
        { ioc_type: 'domain', ioc_value: 'c2-relay.malware-infra.net' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(ipResult.results[0].data.match_count).toBe(1);
      expect(domainResult.results[0].data.match_count).toBe(1);
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    });

    it('returns empty result with descriptive message for unknown IOC', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { ioc_type: 'ip', ioc_value: '127.0.0.1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.match_count).toBe(0);
      expect(result.results[0].data.message).toContain('No threat intelligence found');
    });
  });

  describe('case_manage_tool', () => {
    const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
    const tool = caseManageTool(mockCore, mockLogger);

    const mockCasesClient = {
      cases: {
        create: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
      },
      attachments: {
        add: jest.fn(),
        bulkCreate: jest.fn(),
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockCore.getStartServices.mockResolvedValue([
        {} as never,
        {
          cases: {
            getCasesClientWithRequest: jest.fn().mockReturnValue(mockCasesClient),
          },
        } as never,
        {} as never,
      ]);
    });

    it('creates a case, adds a comment, and retrieves it in sequence', async () => {
      // Step 1: Create
      mockCasesClient.cases.create.mockResolvedValue({
        id: 'case-ir-001',
        title: 'IR-2024-0315: Cobalt Strike Campaign',
        status: 'open',
        severity: 'critical',
      });

      const createResult = (await tool.handler(
        {
          action: 'create',
          title: 'IR-2024-0315: Cobalt Strike Campaign',
          description: 'Critical incident involving Cobalt Strike beacon on domain controller',
          tags: ['incident-response', 'cobalt-strike', 'data-exfiltration'],
          severity: 'critical',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(createResult.results[0].type).toBe(ToolResultType.other);
      expect(createResult.results[0].data.case_id).toBe('case-ir-001');
      expect(createResult.results[0].data.severity).toBe('critical');

      // Step 2: Add comment
      mockCasesClient.attachments.add.mockResolvedValue({
        id: 'case-ir-001',
        title: 'IR-2024-0315: Cobalt Strike Campaign',
        totalComment: 1,
      });

      const commentResult = (await tool.handler(
        {
          action: 'add_comment',
          case_id: 'case-ir-001',
          comment:
            'Triage complete: Confirmed active Cobalt Strike C2 beacon on dc-prod-01. Lateral movement detected to 3 additional hosts.',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(commentResult.results[0].type).toBe(ToolResultType.other);
      expect(commentResult.results[0].data.total_comments).toBe(1);

      // Step 3: Retrieve
      mockCasesClient.cases.get.mockResolvedValue({
        id: 'case-ir-001',
        title: 'IR-2024-0315: Cobalt Strike Campaign',
        description: 'Critical incident involving Cobalt Strike beacon on domain controller',
        version: 'v1',
        status: 'open',
        severity: 'critical',
        tags: ['incident-response', 'cobalt-strike', 'data-exfiltration'],
        totalComment: 1,
        totalAlerts: 0,
        created_at: '2024-03-15T12:00:00Z',
        updated_at: '2024-03-15T12:05:00Z',
        created_by: { username: 'ai-soc-agent' },
      });

      const getResult = (await tool.handler(
        { action: 'get', case_id: 'case-ir-001' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(getResult.results[0].type).toBe(ToolResultType.other);
      expect(getResult.results[0].data.case_id).toBe('case-ir-001');
      expect(getResult.results[0].data.severity).toBe('critical');
      expect(getResult.results[0].data.tags).toEqual([
        'incident-response',
        'cobalt-strike',
        'data-exfiltration',
      ]);
    });

    it('updates case severity and status through the investigation lifecycle', async () => {
      // Get the case first (for version)
      mockCasesClient.cases.get.mockResolvedValue({
        id: 'case-lifecycle-01',
        title: 'Suspicious Activity Investigation',
        version: 'v1',
        status: 'open',
        severity: 'medium',
      });

      // Update severity to critical
      mockCasesClient.cases.update.mockResolvedValueOnce([
        {
          id: 'case-lifecycle-01',
          title: 'Suspicious Activity Investigation',
          status: 'open',
          severity: 'critical',
        },
      ]);

      const severityResult = (await tool.handler(
        {
          action: 'update',
          case_id: 'case-lifecycle-01',
          severity: 'critical',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(severityResult.results[0].type).toBe(ToolResultType.other);

      // Now close the case
      mockCasesClient.cases.get.mockResolvedValue({
        id: 'case-lifecycle-01',
        title: 'Suspicious Activity Investigation',
        version: 'v2',
        status: 'open',
        severity: 'critical',
      });

      mockCasesClient.cases.update.mockResolvedValueOnce([
        {
          id: 'case-lifecycle-01',
          title: 'Suspicious Activity Investigation',
          status: 'closed',
          severity: 'critical',
        },
      ]);

      const closeResult = (await tool.handler(
        {
          action: 'change_status',
          case_id: 'case-lifecycle-01',
          status: 'closed',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(closeResult.results[0].type).toBe(ToolResultType.other);
      expect(closeResult.results[0].data.new_status).toBe('closed');
    });

    it('attaches multiple alerts to a case', async () => {
      // Mock ES search for alert rule info (called before bulkCreate)
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'alert-001',
              _source: { 'kibana.alert.rule.uuid': 'rule-1', 'kibana.alert.rule.name': 'Rule 1' },
            },
            {
              _id: 'alert-002',
              _source: { 'kibana.alert.rule.uuid': 'rule-1', 'kibana.alert.rule.name': 'Rule 1' },
            },
            {
              _id: 'alert-003',
              _source: { 'kibana.alert.rule.uuid': 'rule-2', 'kibana.alert.rule.name': 'Rule 2' },
            },
            {
              _id: 'alert-004',
              _source: { 'kibana.alert.rule.uuid': 'rule-2', 'kibana.alert.rule.name': 'Rule 2' },
            },
            {
              _id: 'alert-005',
              _source: { 'kibana.alert.rule.uuid': 'rule-3', 'kibana.alert.rule.name': 'Rule 3' },
            },
          ],
        },
      } as any);
      mockCasesClient.attachments.bulkCreate.mockResolvedValue({});

      const result = (await tool.handler(
        {
          action: 'attach_alerts',
          case_id: 'case-ir-001',
          alert_ids: ['alert-001', 'alert-002', 'alert-003', 'alert-004', 'alert-005'],
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.attached_alerts).toBe(5);

      const bulkCreateCall = mockCasesClient.attachments.bulkCreate.mock.calls[0][0];
      expect(bulkCreateCall.attachments).toHaveLength(5);
      bulkCreateCall.attachments.forEach((attachment: Record<string, unknown>, index: number) => {
        expect(attachment.type).toBe('alert');
        expect(attachment.alertId).toBe(`alert-00${index + 1}`);
        expect(attachment.owner).toBe('securitySolution');
      });
    });

    it('handles error when cases plugin is not available', async () => {
      mockCore.getStartServices.mockResolvedValue([{} as never, {} as never, {} as never]);

      const result = (await tool.handler(
        { action: 'get', case_id: 'case-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Cases plugin is not available');
    });
  });

  describe('report_generate_tool', () => {
    const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
    const tool = reportGenerateTool(mockCore, mockLogger);

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15T16:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('generates a full markdown report with all sections populated', async () => {
      const result = (await tool.handler(
        {
          title: 'IR-2024-0315: Cobalt Strike Campaign',
          sections: {
            executive_summary:
              'A targeted phishing campaign delivered Cobalt Strike beacons to 3 hosts in the Finance department. The attacker gained domain admin credentials and exfiltrated 2.1GB of financial records. The incident was contained within 4 hours.',
            timeline:
              '08:00 - Phishing email delivered\n08:15 - Macro executed, beacon deployed\n08:45 - Credential theft via LSASS dump\n09:00 - Lateral movement to file-server-01 and dc-prod-01\n09:30 - Data staging began\n10:00 - 2.1GB exfiltrated\n12:00 - SOC detected anomalous traffic\n12:15 - Incident response initiated',
            mitre_mapping:
              'T1566.001 - Spear-phishing Attachment\nT1059.001 - PowerShell\nT1053.005 - Scheduled Task\nT1003.001 - LSASS Memory\nT1021.002 - SMB/Admin Shares\nT1048.002 - Exfiltration Over Asymmetric Encrypted Channel',
            impact_assessment:
              '3 hosts compromised, 2 user accounts affected (1 domain admin), 2.1GB financial data exfiltrated, 6 hours of portal downtime, estimated $150K revenue impact.',
            recommendations:
              '1. Rotate all domain admin credentials\n2. Block C2 IP range at perimeter\n3. Deploy additional EDR rules for PowerShell cradle detection\n4. Conduct security awareness training for Finance department',
          },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.format).toBe('markdown');
      expect(result.results[0].data.section_count).toBe(5);

      const report = result.results[0].data.report as string;
      expect(report).toContain('# Incident Report: IR-2024-0315: Cobalt Strike Campaign');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Incident Timeline');
      expect(report).toContain('## MITRE ATT&CK Mapping');
      expect(report).toContain('## Impact Assessment');
      expect(report).toContain('## Recommendations');
      expect(report).toContain('**Generated:** 2024-03-15T16:00:00.000Z');
      expect(report).toContain('T1566.001');
      expect(report).toContain('2.1GB');
    });

    it('generates a JSON report with correct structure', async () => {
      const result = (await tool.handler(
        {
          title: 'JSON Incident Report',
          sections: {
            executive_summary: 'A ransomware incident was detected and contained.',
            timeline: '10:00 - Ransomware detected\n10:15 - Hosts isolated\n10:30 - Contained',
            mitre_mapping: 'T1486 - Data Encrypted for Impact',
            impact_assessment: '5 hosts affected, no data loss confirmed.',
          },
          format: 'json',
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.format).toBe('json');
      const report = result.results[0].data.report as Record<string, unknown>;

      expect(report.title).toBe('JSON Incident Report');
      expect(report.status).toBe('draft');
      expect(report.generated_at).toBe('2024-03-15T16:00:00.000Z');

      const sections = report.sections as Record<string, unknown>;
      expect(sections.executive_summary).toBeDefined();
      expect(sections.timeline).toBeDefined();
      expect(sections.mitre_mapping).toBeDefined();
      expect(sections.impact_assessment).toBeDefined();
      expect(sections.recommendations).toBeUndefined();
    });

    it('generates minimal report with only required sections', async () => {
      const result = (await tool.handler(
        {
          title: 'Minimal Report',
          sections: {
            executive_summary: 'Brief summary of a minor incident.',
            timeline: '14:00 - Alert triggered\n14:05 - Investigated and closed.',
          },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.section_count).toBe(2);
      const report = result.results[0].data.report as string;
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Incident Timeline');
      expect(report).not.toContain('## MITRE ATT&CK Mapping');
      expect(report).not.toContain('## Impact Assessment');
      expect(report).not.toContain('## Recommendations');
    });
  });

  describe('entity_store_query_tool', () => {
    const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
    const tool = entityStoreQueryTool(mockCore, mockLogger);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('queries a specific host entity and returns enriched profile', async () => {
      const mockEntityHit = {
        _id: 'entity-host-1',
        _index: '.entities.v1.latest.security_host_default',
        _source: {
          'entity.name': 'dc-prod-01',
          'host.name': 'dc-prod-01',
          'host.os': { name: 'Windows Server 2022', platform: 'windows' },
          'host.ip': ['10.0.50.10'],
          'entity.risk': {
            calculated_score_norm: 92,
            calculated_level: 'Critical',
          },
          'asset.criticality': 'extreme_impact',
          'entity.source': ['logs-endpoint', 'logs-system', 'risk-score'],
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [mockEntityHit],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { entity_type: 'host', identifier: 'dc-prod-01' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          entity_type: 'host',
          identifier: 'dc-prod-01',
          count: 1,
        })
      );

      const entities = result.results[0].data.entities as Array<Record<string, unknown>>;
      expect(entities).toHaveLength(1);
      expect(entities[0]['entity.name']).toBe('dc-prod-01');
    });

    it('queries wildcard for top entities sorted by risk score', async () => {
      const mockEntities = [
        {
          _id: 'entity-1',
          _index: '.entities.v1.latest.security_host_default',
          _source: {
            'entity.name': 'dc-prod-01',
            'host.name': 'dc-prod-01',
            'entity.risk': { calculated_score_norm: 92 },
          },
        },
        {
          _id: 'entity-2',
          _index: '.entities.v1.latest.security_host_default',
          _source: {
            'entity.name': 'web-prod-05',
            'host.name': 'web-prod-05',
            'entity.risk': { calculated_score_norm: 78 },
          },
        },
        {
          _id: 'entity-3',
          _index: '.entities.v1.latest.security_host_default',
          _source: {
            'entity.name': 'dev-server-12',
            'host.name': 'dev-server-12',
            'entity.risk': { calculated_score_norm: 25 },
          },
        },
      ];

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: mockEntities,
          total: { value: 3, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { entity_type: 'host', identifier: '*', limit: 5 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.count).toBe(3);

      // Verify the ES query used correct sort
      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(searchCall.index).toBe('.entities.v1.latest.security_host_default');
      expect(searchCall.size).toBe(5);
      expect(searchCall.sort).toEqual([
        { 'entity.risk.calculated_score_norm': { order: 'desc', missing: '_last' } },
      ]);
    });

    it('queries user entities by name', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'entity-user-1',
              _index: '.entities.v1.latest.security_user_default',
              _source: {
                'entity.name': 'admin-jsmith',
                'user.name': 'admin-jsmith',
                'user.domain': 'corp.example.com',
                'entity.risk': { calculated_score_norm: 87 },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { entity_type: 'user', identifier: 'admin-jsmith' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.entity_type).toBe('user');
      expect(result.results[0].data.identifier).toBe('admin-jsmith');

      // Verify correct index was queried
      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(searchCall.index).toBe('.entities.v1.latest.security_user_default');
    });

    it('returns error when entity is not found', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as never);

      const result = (await tool.handler(
        { entity_type: 'host', identifier: 'nonexistent-host' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as ErrorResult).data.message).toContain(
        'No entity found for host with identifier: nonexistent-host'
      );
    });

    it('returns specific fields when requested', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'entity-1',
              _index: '.entities.v1.latest.security_host_default',
              _source: {
                'entity.name': 'dc-prod-01',
                'entity.risk': { calculated_score_norm: 92 },
              },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

      await tool.handler(
        {
          entity_type: 'host',
          identifier: 'dc-prod-01',
          fields: ['entity.name', 'entity.risk'],
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const searchCall = mockEsClient.asCurrentUser.search.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(searchCall._source).toEqual(['entity.name', 'entity.risk']);
    });

    it('handles ES errors gracefully', async () => {
      mockEsClient.asCurrentUser.search.mockRejectedValue(new Error('index_not_found_exception'));

      const result = (await tool.handler(
        { entity_type: 'service', identifier: 'svc-api' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
      expect((result.results[0] as ErrorResult).data.message).toContain(
        'index_not_found_exception'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
