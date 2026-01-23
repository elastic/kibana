/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  generateErrorGroupsData,
  type ErrorServiceConfig,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_error_groups/tool';
import type { ErrorGroup } from '@kbn/observability-agent-builder-plugin/server/tools/get_error_groups/handler';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { SynthtraceProvider } from '../../../services/synthtrace';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetErrorGroupsToolResult extends OtherResult {
  data: {
    errorGroups: ErrorGroup[];
  };
}

const START = 'now-15m';
const END = 'now';

const testServices: ErrorServiceConfig[] = [
  {
    name: 'payment-service',
    environment: 'production',
    agentName: 'java',
    transactionName: 'POST /api/payment',
    errors: [
      {
        type: 'NullPointerException',
        message: 'Cannot invoke method on null object',
        culprit: 'com.example.payment.PaymentProcessor.processPayment',
        handled: true,
        rate: 5,
      },
      {
        type: 'TimeoutException',
        message: 'Connection timed out after 30000ms',
        culprit: 'com.example.payment.PaymentGateway.connect',
        handled: false,
        rate: 2,
      },
    ],
  },
  {
    name: 'user-service',
    environment: 'production',
    agentName: 'nodejs',
    transactionName: 'GET /api/user',
    errors: [
      {
        type: 'ValidationException',
        message: 'Invalid email format',
        culprit: 'UserValidator.validate at src/validators/user.js:42',
        handled: true,
        rate: 3,
      },
    ],
  },
  {
    name: 'order-service',
    environment: 'staging',
    agentName: 'python',
    transactionName: 'POST /api/order',
    errors: [
      {
        type: 'OutOfStockException',
        message: 'Product is out of stock',
        culprit: 'inventory_service.reserve in app/services/inventory.py:87',
        handled: true,
        rate: 4,
      },
    ],
  },
];

const historicalServices: ErrorServiceConfig[] = [
  {
    name: 'payment-service',
    environment: 'production',
    agentName: 'java',
    transactionName: 'POST /api/payment',
    errors: [
      {
        type: 'NullPointerException',
        message: 'Cannot invoke method on null object',
        culprit: 'com.example.payment.PaymentProcessor.processPayment',
        handled: true,
        rate: 1,
      },
    ],
  },
];

async function setupSynthtraceData(synthtrace: ReturnType<typeof SynthtraceProvider>) {
  const esClient = await synthtrace.createApmSynthtraceEsClient();
  await esClient.clean();

  // generate an old error group
  const historicalRange = timerange('now-15d', 'now-15d+5m');
  const { client: historicalClient, generator: historicalGenerator } = generateErrorGroupsData({
    range: historicalRange,
    apmEsClient: esClient,
    services: historicalServices,
  });

  await historicalClient.index(historicalGenerator);

  const range = timerange(START, END);
  const { client, generator } = generateErrorGroupsData({
    range,
    apmEsClient: esClient,
    services: testServices,
  });

  await client.index(generator);

  return esClient;
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await setupSynthtraceData(synthtrace);
    });

    after(async () => {
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
    });

    it('returns error groups with expected structure', async () => {
      const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
        id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
        params: { start: START, end: END },
      });

      expect(results).to.have.length(1);
      const { errorGroups } = results[0].data;

      expect(errorGroups.length).to.be(4);

      for (const group of errorGroups) {
        expect(group.groupId).to.be.a('string');
        expect(group.count).to.be.greaterThan(0);
        expect(group.lastSeen).to.be.a('string');

        const sample = group.sample as Record<string, unknown>;
        expect(sample['error.grouping_key']).to.be(group.groupId);
        expect(sample['service.name']).to.be.a('string');
      }
    });

    describe('when filtering by service.name', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "payment-service"',
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns only error groups from payment-service', () => {
        expect(errorGroups).to.have.length(2);
      });

      it('all returned groups belong to payment-service', () => {
        for (const group of errorGroups) {
          const sample = group.sample as Record<string, unknown>;
          expect(sample['service.name']).to.be('payment-service');
        }
      });
    });

    describe('when filtering by error.exception.type', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'error.exception.type: "TimeoutException"',
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns only error groups with TimeoutException', () => {
        expect(errorGroups).to.have.length(1);
      });

      it('returned group has the correct exception type', () => {
        const sample = errorGroups[0].sample as Record<string, unknown>;
        expect(sample['error.exception.type']).to.be('TimeoutException');
      });
    });

    describe('when fetching error groups with includeFirstSeen', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            includeFirstSeen: true,
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns all error groups', () => {
        expect(errorGroups).to.have.length(4);
      });

      it('includes firstSeen for each group', () => {
        for (const group of errorGroups) {
          expect(group).to.have.property('firstSeen');
          expect(group.firstSeen).to.be.a('string');
        }
      });

      it('returns "over 14 days ago" for errors that existed before the lookback window', () => {
        const oldGroup = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.message'] === 'Cannot invoke method on null object';
        });

        expect(oldGroup!.firstSeen).to.be('over 14 days ago');
      });

      it('returns an ISO timestamp for errors that first appeared within the lookback window', () => {
        const newGroup = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'ValidationException';
        });

        const firstSeenTime = new Date(newGroup!.firstSeen!).getTime();

        expect(firstSeenTime).to.be.greaterThan(datemath.parse(START)!.valueOf());
        expect(firstSeenTime).to.be.lessThan(datemath.parse(END)!.valueOf());
      });
    });

    describe('when fetching error groups with includeStackTrace', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            includeStackTrace: true,
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns all error groups', () => {
        expect(errorGroups).to.have.length(4);
      });

      it('includes error details in sample (stack trace may be undefined in dataset)', () => {
        for (const group of errorGroups) {
          const sample = group.sample as Record<string, unknown>;
          expect(sample).to.have.property('error.exception.message');
          expect(sample).to.have.property('error.exception.type');
        }
      });
    });
  });
}
