/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { ActionsClientChatOpenAI } from '@kbn/langchain/server/language_models';
import { loggerMock } from '@kbn/logging-mocks';
import type { NodeResponse } from '../__mocks__/mocks';
import { SiemMigrationFakeLLM, MockSiemMigrationTelemetryClient } from '../__mocks__/mocks';
import { MockEsqlKnowledgeBase } from '../../../common/task/util/__mocks__/mocks';
import { MockDashboardMigrationsRetriever } from '../retrievers/__mocks__/mocks';
import { getDashboardMigrationAgent } from './graph';
import type { OriginalDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';

const mockOriginalDashboardData = fs.readFileSync(
  `${__dirname}/../../__mocks__/original_dashboard_example.xml`
);

const mockOriginalDashboard: OriginalDashboard = {
  id: 'b12c89bc-9d06-11eb-a592-acde48001122',
  vendor: 'splunk' as const,
  title: 'Office Document Executing Macro Code',
  description:
    'The following analytic identifies office documents executing macro code. It leverages Sysmon EventCode 7 to detect when processes like WINWORD.EXE or EXCEL.EXE load specific DLLs associated with macros (e.g., VBE7.DLL). This activity is significant because macros are a common attack vector for delivering malicious payloads, such as malware. If confirmed malicious, this could lead to unauthorized code execution, data exfiltration, or further compromise of the system. Disabling macros by default is recommended to mitigate this risk.',
  data: mockOriginalDashboardData,
  format: 'xml',
};

const logger = loggerMock.create();
let fakeLLM: SiemMigrationFakeLLM;
let mockRetriever = new MockDashboardMigrationsRetriever();
let mockEsqlKnowledgeBase = new MockEsqlKnowledgeBase();
let mockTelemetryClient = new MockSiemMigrationTelemetryClient();

const setupAgent = (responses: NodeResponse[]) => {
  fakeLLM = new SiemMigrationFakeLLM({ nodeResponses: responses });
  const model = fakeLLM as unknown as ActionsClientChatOpenAI;
  const graph = getDashboardMigrationAgent({
    model,
    esqlKnowledgeBase: mockEsqlKnowledgeBase,
    dashboardMigrationsRetriever: mockRetriever,
    logger,
    telemetryClient: mockTelemetryClient,
  });
  return graph;
};

describe('getDashboardMigrationAgent', () => {
  beforeEach(() => {
    mockRetriever = new MockDashboardMigrationsRetriever();
    mockTelemetryClient = new MockSiemMigrationTelemetryClient();
    mockEsqlKnowledgeBase = new MockEsqlKnowledgeBase();
    jest.clearAllMocks();
  });

  it('should compile graph', () => {
    setupAgent([{ nodeId: '', response: '' }]);
  });

  it('should run graph', async () => {
    const agent = setupAgent([{ nodeId: '', response: '' }]);
    const result = await agent.invoke({
      id: 'testId',
      original_dashboard: mockOriginalDashboard,
      resources: {},
    });

    expect(result).toEqual(expect.any(Object));
  });
});
