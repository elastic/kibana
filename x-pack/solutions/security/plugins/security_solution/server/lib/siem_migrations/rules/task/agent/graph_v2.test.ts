/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { loggerMock } from '@kbn/logging-mocks';
import type { NodeResponse } from '../__mocks__/mocks';
import { SiemMigrationFakeLLM, MockSiemMigrationTelemetryClient } from '../__mocks__/mocks';
import { MockEsqlKnowledgeBase } from '../../../common/task/util/__mocks__/mocks';
import { MockRuleMigrationsRetriever } from '../retrievers/__mocks__/mocks';
import { getRuleMigrationAgentV2 } from './graph_v2';
import { getRulesMigrationTools } from './tools';
import { createRuleMigrationsDataClientMock } from '../../data/__mocks__/mocks';

const mockOriginalRule = {
  id: 'b12c89bc-9d06-11eb-a592-acde48001122',
  vendor: 'splunk' as const,
  query_language: 'spl',
  title: 'Office Document Executing Macro Code',
  description:
    'The following analytic identifies office documents executing macro code. It leverages Sysmon EventCode 7 to detect when processes like WINWORD.EXE or EXCEL.EXE load specific DLLs associated with macros (e.g., VBE7.DLL). This activity is significant because macros are a common attack vector for delivering malicious payloads, such as malware. If confirmed malicious, this could lead to unauthorized code execution, data exfiltration, or further compromise of the system. Disabling macros by default is recommended to mitigate this risk.',
  query:
    '`sysmon` EventCode=7 process_name IN ("WINWORD.EXE", "EXCEL.EXE", "POWERPNT.EXE","onenote.exe","onenotem.exe","onenoteviewer.exe","onenoteim.exe","msaccess.exe") loaded_file_path IN ("*\\\\VBE7INTL.DLL","*\\\\VBE7.DLL", "*\\\\VBEUI.DLL") | stats min(_time) as firstTime max(_time) as lastTime values(loaded_file) as loaded_file count by dest EventCode process_name process_guid | `security_content_ctime(firstTime)` | `security_content_ctime(lastTime)` | `office_document_executing_macro_code_filter`',
};

const mockPartialNlToEsqlResponse =
  '```esql\nFROM logs-*\n| STATS web_event_count = COUNT(*) BY src, http_method\n| LOOKUP JOIN "app:count_by_http_method_by_src_1d" ON src\n```';

const mockPrebuiltRule = {
  rule_id: 'test-rule',
  description: 'test-description',
  name: 'Suspicious MS Office Child Process',
};

const mockIncorrectRuleName = {
  ...mockPrebuiltRule,
  name: 'wrong-name',
};

const mockSemanticQueryResponse = JSON.stringify({
  semantic_query:
    'web http abnormal high volume requests method source ip network traffic analysis datamodel web security',
});

const mockPrebuiltRuleMatchResponse = JSON.stringify({
  match: 'Suspicious MS Office Child Process',
  semantic_query: 'suspicious ms office child process macro',
  summary:
    '## Prebuilt Rule Matching Summary\\nThe Splunk rule "Office Document Executing Macro Code" is closely related to the Elastic rule "Suspicious MS Office Child Process". Both rules aim to detect potentially malicious activity originating from Microsoft Office applications.',
});

const mockPrebuiltRuleNoMatchResponse = JSON.stringify({
  match: '',
  semantic_query: 'office document macro code execution',
  summary: '## Prebuilt Rule Matching Summary\\n No matches found',
});

const mockIntegrationNoMatchResponse = JSON.stringify({
  match: '',
  summary: '## Integration Matching Summary\\nNo related integration found.',
});

const logger = loggerMock.create();
let fakeLLM: SiemMigrationFakeLLM;
let mockRetriever = new MockRuleMigrationsRetriever();
let mockEsqlKnowledgeBase = new MockEsqlKnowledgeBase();
let mockTelemetryClient = new MockSiemMigrationTelemetryClient();

const setupAgent = async (responses: NodeResponse[]) => {
  fakeLLM = new SiemMigrationFakeLLM({ nodeResponses: responses });
  const model = fakeLLM as unknown as InferenceChatModel;
  const graph = getRuleMigrationAgentV2({
    model,
    esqlKnowledgeBase: mockEsqlKnowledgeBase,
    ruleMigrationsRetriever: mockRetriever,
    logger,
    telemetryClient: mockTelemetryClient,
    tools: getRulesMigrationTools('test-migration', {
      rulesClient: createRuleMigrationsDataClientMock(),
    }),
  });
  return graph;
};

// This tests the v2 `matchPrebuiltRule` subgraph path (security-team#18589), used when the
// `ruleMigrationGraphv2` experimental feature is enabled. The subgraph agent generates its own
// pre-built-rule-specific semantic query instead of consuming the parent's `semantic_query`.
// See `./graph.test.ts` for the v1 one-shot node path (flag disabled, default).
describe('getRuleMigrationAgentV2', () => {
  beforeEach(() => {
    mockRetriever = new MockRuleMigrationsRetriever();
    mockTelemetryClient = new MockSiemMigrationTelemetryClient();
    mockEsqlKnowledgeBase = new MockEsqlKnowledgeBase();
    jest.clearAllMocks();
  });

  describe('graph compilation', () => {
    it('ensures that the graph compiles', async () => {
      await setupAgent([{ nodeId: '', response: '' }]);
    });
  });

  describe('prebuilt rules', () => {
    // Eval note (security-team#18589): compare prebuilt match rates for Splunk, QRadar, and
    // Sentinel via kbn-evals-suite-security-automatic-migrations prebuilt_rule_match evaluator.
    it('successful match via the match subgraph', async () => {
      mockRetriever.prebuiltRules.search.mockResolvedValue([mockPrebuiltRule]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: mockSemanticQueryResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: mockPrebuiltRuleMatchResponse,
        },
      ]);
      const response = await graph.invoke({
        original_rule: mockOriginalRule,
      });
      expect(response.elastic_rule?.prebuilt_rule_id).toEqual('test-rule');
      expect(response.translation_result).toEqual('full');
      expect(fakeLLM.getNodeCallCount('matchPrebuiltRule')).toBe(1);
    });

    it('llm respond with non existing prebuilt rule name', async () => {
      mockRetriever.prebuiltRules.search.mockResolvedValue([mockIncorrectRuleName]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: mockSemanticQueryResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: mockPrebuiltRuleMatchResponse,
        },
      ]);

      const response = await graph.invoke({
        id: 'test',
        original_rule: mockOriginalRule,
        resources: {},
      });
      expect(response.elastic_rule?.prebuilt_rule_id).toEqual(undefined);
      expect(mockRetriever.prebuiltRules.search).toHaveBeenCalledTimes(1);
      expect(response.translation_result).toEqual('untranslatable');
      expect(fakeLLM.getNodeCallCount('matchPrebuiltRule')).toBe(1);
    });

    it('no prebuilt rule matches', async () => {
      mockRetriever.prebuiltRules.search.mockResolvedValue([]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: mockSemanticQueryResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: mockPrebuiltRuleNoMatchResponse,
        },
      ]);
      const response = await graph.invoke({
        id: 'test',
        original_rule: mockOriginalRule,
        resources: {},
      });
      expect(mockRetriever.prebuiltRules.search).toHaveBeenCalledTimes(1);
      expect(response.translation_result).toEqual('untranslatable');
    });

    it('skipPrebuiltRulesMatching bypasses the match subgraph', async () => {
      mockEsqlKnowledgeBase.translate.mockResolvedValue(mockPartialNlToEsqlResponse);
      mockRetriever.integrations.search.mockResolvedValue([]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: mockSemanticQueryResponse,
        },
        {
          nodeId: 'retrieveIntegrations',
          response: mockIntegrationNoMatchResponse,
        },
      ]);

      const response = await graph.invoke(
        {
          id: 'test',
          original_rule: mockOriginalRule,
          resources: {},
        },
        { configurable: { skipPrebuiltRulesMatching: true } }
      );

      expect(fakeLLM.getNodeCallCount('matchPrebuiltRule')).toBe(0);
      expect(mockRetriever.prebuiltRules.search).not.toHaveBeenCalled();
      expect(response.elastic_rule?.prebuilt_rule_id).toBeUndefined();
      expect(response.translation_result).toEqual('partial');
    });
  });
});
