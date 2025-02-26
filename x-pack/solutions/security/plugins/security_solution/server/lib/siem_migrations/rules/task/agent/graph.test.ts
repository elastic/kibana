/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientChatOpenAI } from '@kbn/langchain/server/language_models';
import { loggerMock } from '@kbn/logging-mocks';
import type { NodeResponse } from '../__mocks__/mocks';
import { SiemMigrationFakeLLM, createSiemMigrationTelemetryClientMock } from '../__mocks__/mocks';
import { createRuleMigrationsRetrieverMock } from '../retrievers/__mocks__/mocks';
import { createEsqlKnowledgeBaseMock } from '../util/__mocks__/mocks';
import { getRuleMigrationAgent } from './graph';

const mockedOriginalRule = {
  id: 'b12c89bc-9d06-11eb-a592-acde48001122',
  vendor: 'splunk',
  title: 'Office Document Executing Macro Code',
  description:
    'The following analytic identifies office documents executing macro code. It leverages Sysmon EventCode 7 to detect when processes like WINWORD.EXE or EXCEL.EXE load specific DLLs associated with macros (e.g., VBE7.DLL). This activity is significant because macros are a common attack vector for delivering malicious payloads, such as malware. If confirmed malicious, this could lead to unauthorized code execution, data exfiltration, or further compromise of the system. Disabling macros by default is recommended to mitigate this risk.',
  query:
    '`sysmon` EventCode=7 process_name IN ("WINWORD.EXE", "EXCEL.EXE", "POWERPNT.EXE","onenote.exe","onenotem.exe","onenoteviewer.exe","onenoteim.exe","msaccess.exe") loaded_file_path IN ("*\\\\VBE7INTL.DLL","*\\\\VBE7.DLL", "*\\\\VBEUI.DLL") | stats min(_time) as firstTime max(_time) as lastTime values(loaded_file) as loaded_file count by dest EventCode process_name process_guid | `security_content_ctime(firstTime)` | `security_content_ctime(lastTime)` | `office_document_executing_macro_code_filter`',
};

const mockedIntegrationResult = {
  id: 'testintegration',
  title: 'testintegration',
  description: 'testintegration',
  data_streams: [
    {
      dataset: 'teststream',
      title: 'teststream',
      index_pattern: 'logs-testintegration-testdatastream-default',
    },
  ],
  elser_embedding: 'testintegration - testintegration - teststream',
};

const mockedValidNlToEsqlResponse =
  '```esql\nFROM logs-*\n| STATS web_event_count = COUNT(*) BY src, http_method\n| LOOKUP JOIN "app:count_by_http_method_by_src_1d" ON src\n```';

const mockedOriginalInputLookup = {
  ...mockedOriginalRule,
  query: 'inputlookup something test',
};

const mockPrebuiltRule = {
  rule_id: 'test-rule',
  description: 'test-description',
  name: 'Suspicious MS Office Child Process',
};

const mockedIncorrectRuleName = {
  ...mockPrebuiltRule,
  name: 'wrong-name',
};

const createSemanticQueryDefaultResponse = JSON.stringify({
  semantic_query:
    'web http abnormal high volume requests method source ip network traffic analysis datamodel web security',
});

const successfullPrebuiltMatchResponse = JSON.stringify({
  match: 'Suspicious MS Office Child Process',
  summary:
    '## Prebuilt Rule Matching Summary\\nThe Splunk rule "Office Document Executing Macro Code" is closely related to the Elastic rule "Suspicious MS Office Child Process". Both rules aim to detect potentially malicious activity originating from Microsoft Office applications. While the Splunk rule specifically looks for the loading of macro-related DLLs, the Elastic rule takes a broader approach by monitoring for suspicious child processes of Office applications, which would include processes initiated by macro execution. The Elastic rule provides a more comprehensive coverage of potential threats, including but not limited to macro-based attacks, making it a suitable match for the given Splunk rule\'s intent.',
});

const noPrebuiltMatchResponse = JSON.stringify({
  match: '',
  summary: '## Prebuilt Rule Matching Summary\\n No matches found',
});

const noIntegrationMatchResponse = JSON.stringify({
  match: '',
  summary: '## Integration Matching Summary\\nNo related integration found.',
});

const integrationMatchResponse = JSON.stringify({
  match: 'testintegration',
  summary: '## Integration Matching Summary\\nNo Found one testintegration',
});

const mockRetriever = createRuleMigrationsRetrieverMock();
const mockEsqlKnowledgeBase = createEsqlKnowledgeBaseMock();
const telemetryClient = createSiemMigrationTelemetryClientMock();
const logger = loggerMock.create();
let fakeLLM: SiemMigrationFakeLLM;
let mockedSearch: jest.Mock;
let mockedEsqlKnowledgeBase: jest.Mock;
let mockedIntegration: jest.Mock;

const setupAgent = async (responses: NodeResponse[]) => {
  fakeLLM = new SiemMigrationFakeLLM({ nodeResponses: responses });
  const model = fakeLLM as unknown as ActionsClientChatOpenAI;
  try {
    const graph = await getRuleMigrationAgent({
      model,
      esqlKnowledgeBase: mockEsqlKnowledgeBase,
      ruleMigrationsRetriever: mockRetriever,
      logger,
      telemetryClient,
    });
    return graph;
  } catch (error) {
    throw Error(`getRuleMigrationAgent threw an error: ${error}`);
  }
};

describe('getRuleMigrationAgent', () => {
  beforeEach(() => {
    mockedSearch = mockRetriever.prebuiltRules.search as jest.Mock;
    mockedEsqlKnowledgeBase = mockEsqlKnowledgeBase.translate as jest.Mock;
    mockedIntegration = mockRetriever.integrations.getIntegrations as jest.Mock;
    jest.clearAllMocks();
  });
  describe('graph compilation', () => {
    it('ensures that the graph compiles', async () => {
      await setupAgent([{ nodeId: '', response: '' }]);
    });
  });
  describe('prebuilt rules', () => {
    it('successful match', async () => {
      mockedSearch.mockResolvedValue([mockPrebuiltRule]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: createSemanticQueryDefaultResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: successfullPrebuiltMatchResponse,
        },
      ]);
      const response = await graph.invoke({ original_rule: mockedOriginalRule });
      expect(response.elastic_rule?.prebuilt_rule_id).toEqual('test-rule');
      expect(response.translation_result).toEqual('full');
      expect(fakeLLM.getNodeCallCount('matchPrebuiltRule')).toBe(1);
    });
    it('llm respond with non existing integration name', async () => {
      mockedSearch.mockResolvedValue([mockedIncorrectRuleName]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: createSemanticQueryDefaultResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: successfullPrebuiltMatchResponse,
        },
      ]);

      const response = await graph.invoke({ original_rule: mockedOriginalRule });
      expect(response.elastic_rule?.prebuilt_rule_id).toEqual(undefined);
      expect(mockedSearch).toHaveBeenCalledTimes(1);
      expect(response.translation_result).toEqual('untranslatable');
      expect(fakeLLM.getNodeCallCount('matchPrebuiltRule')).toBe(1);
    });
    it('no prebuilt rule matches', async () => {
      mockedSearch.mockResolvedValue([]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: createSemanticQueryDefaultResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: noPrebuiltMatchResponse,
        },
      ]);
      const response = await graph.invoke({ original_rule: mockedOriginalRule });
      expect(mockedSearch).toHaveBeenCalledTimes(1);
      expect(response.translation_result).toEqual('untranslatable');
    });
  });
  describe('custom translation', () => {
    it('unsupported query', async () => {
      mockedSearch.mockResolvedValue([mockPrebuiltRule]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: createSemanticQueryDefaultResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: noPrebuiltMatchResponse,
        },
      ]);

      const response = await graph.invoke({ original_rule: mockedOriginalInputLookup });
      expect(mockedSearch).toHaveBeenCalledTimes(1);
      expect(response.translation_result).toEqual('untranslatable');
      // Because of the inputlookup in the query, we expect it to end before calling the LLM
      expect(fakeLLM.getNodeCallCount('inlineQuery')).toBe(0);
    });
    it('no integrations found in RAG and partial results', async () => {
      mockedEsqlKnowledgeBase.mockResolvedValue(mockedValidNlToEsqlResponse);
      mockedSearch.mockResolvedValue([mockPrebuiltRule]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: createSemanticQueryDefaultResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: noPrebuiltMatchResponse,
        },
        {
          nodeId: 'retrieveIntegrations',
          response: noIntegrationMatchResponse,
        },
      ]);
      const response = await graph.invoke({ original_rule: mockedOriginalRule });
      expect(mockedSearch).toHaveBeenCalledTimes(1);
      expect(mockedEsqlKnowledgeBase).toHaveBeenCalledTimes(2);
      expect(response.translation_result).toEqual('partial');
      expect(fakeLLM.getNodeCallCount('retrieveIntegrations')).toBe(0);
    });
    it('integration found and full translation results', async () => {
      mockedEsqlKnowledgeBase.mockResolvedValue(mockedValidNlToEsqlResponse);
      mockedSearch.mockResolvedValue([mockPrebuiltRule]);
      mockedIntegration.mockResolvedValue([mockedIntegrationResult]);
      const graph = await setupAgent([
        {
          nodeId: 'createSemanticQuery',
          response: createSemanticQueryDefaultResponse,
        },
        {
          nodeId: 'matchPrebuiltRule',
          response: noPrebuiltMatchResponse,
        },
        {
          nodeId: 'retrieveIntegrations',
          response: integrationMatchResponse,
        },
      ]);
      const response = await graph.invoke({ original_rule: mockedOriginalRule });
      expect(mockedSearch).toHaveBeenCalledTimes(1);
      expect(mockedEsqlKnowledgeBase).toHaveBeenCalledTimes(2);
      expect(response.translation_result).toEqual('full');
      expect(fakeLLM.getNodeCallCount('retrieveIntegrations')).toBe(1);
    });
  });
});
