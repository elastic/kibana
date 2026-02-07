/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { loggerMock } from '@kbn/logging-mocks';
import type { NodeResponse } from '../__mocks__/mocks';
import { SiemMigrationFakeLLM, MockSiemMigrationTelemetryClient } from '../__mocks__/mocks';
import { MockEsqlKnowledgeBase } from '../../../common/task/util/__mocks__/mocks';
import { MockDashboardMigrationsRetriever } from '../retrievers/__mocks__/mocks';
import { getDashboardMigrationAgent } from './graph';
import type { OriginalDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../../../../common';

jest.mock(
  '../../../../../assistant/tools/esql/graphs/select_index_pattern/select_index_pattern',
  () => {
    return { getSelectIndexPatternGraph: jest.fn() };
  }
);

const mockOriginalDashboardData = fs
  .readFileSync(`${__dirname}/../../__mocks__/original_dashboard_example.xml`)
  .toString('utf-8');

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
const esClientMock =
  elasticsearchServiceMock.createCustomClusterClient() as unknown as jest.MockedObjectDeep<IScopedClusterClient>;

const setupAgent = (responses: NodeResponse[]) => {
  fakeLLM = new SiemMigrationFakeLLM({ nodeResponses: responses });
  const model = fakeLLM as unknown as InferenceChatModel;
  const graph = getDashboardMigrationAgent({
    model,
    esScopedClient: esClientMock,
    esqlKnowledgeBase: mockEsqlKnowledgeBase,
    dashboardMigrationsRetriever: mockRetriever,
    logger,
    telemetryClient: mockTelemetryClient,
    inference: {
      getClient: jest.fn(),
      getChatModel: jest.fn(),
      getConnectorList: jest.fn(),
      getDefaultConnector: jest.fn(),
      getConnectorById: jest.fn(),
      ...model,
    },
    request: httpServerMock.createKibanaRequest(),
    connectorId: 'test-connector',
    experimentalFeatures: { splunkV2DashboardsEnabled: false } as unknown as ExperimentalFeatures,
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
    const agent = setupAgent([{ nodeId: 'createDescriptions', response: '{}' }]);
    const result = await agent.invoke({
      id: 'testId',
      original_dashboard: mockOriginalDashboard,
      resources: {},
    });

    expect(result).toEqual(expect.any(Object));
  });
});
