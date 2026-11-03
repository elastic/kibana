/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { generateEsql, GenerateEsqlNoDataError } from '@kbn/agent-builder-genai-utils';
import type { RuleCreationState } from '../../../state';
import { generateEsqlQueryNode } from './generate_esql_query';

jest.mock('@kbn/agent-builder-genai-utils', () => {
  const actual = jest.requireActual('@kbn/agent-builder-genai-utils');
  return { ...actual, generateEsql: jest.fn() };
});

const generateEsqlMock = generateEsql as jest.MockedFunction<typeof generateEsql>;

const createState = (): RuleCreationState => ({
  userQuery: 'detect Langflow refresh requests with cross-origin credentials',
  rule: {},
  errors: [],
  warnings: [],
  rejectionReason: undefined,
  rejectionMessage: undefined,
});

const createNode = () =>
  generateEsqlQueryNode({
    model: {} as InferenceChatModel,
    esClient: {} as ElasticsearchClient,
    connectorId: 'connector-id',
    inference: {
      getClient: () => ({ getConnectorById: jest.fn().mockResolvedValue({}) }),
    } as unknown as InferenceServerStart,
    logger: loggingSystemMock.createLogger(),
    request: {} as KibanaRequest,
  });

describe('generateEsqlQueryNode', () => {
  beforeEach(() => {
    generateEsqlMock.mockReset();
  });

  it('sets the generated query on the rule when it reads from an index', async () => {
    const query = 'FROM logs-* METADATA _id, _index, _version | WHERE event.action == "login"';
    generateEsqlMock.mockResolvedValue({ query });

    const node = await createNode();
    const result = await node(createState());

    expect(result).toEqual(
      expect.objectContaining({ rule: { query, language: 'esql', type: 'esql' } })
    );
    expect(result.rejectionReason).toBeUndefined();
  });

  it('rejects with NO_DATA when the generated query reads from no index', async () => {
    const query =
      'ROW status = "No suitable index was found in the supplied context. No rule was generated."';
    generateEsqlMock.mockResolvedValue({ query });

    const node = await createNode();
    const result = await node(createState());

    expect(result).toEqual({
      rejectionReason: {
        code: 'NO_DATA',
        message: 'The generated ES|QL query does not read from any index',
        details: query,
      },
    });
  });

  it('rejects with NO_DATA when index discovery finds no index', async () => {
    generateEsqlMock.mockRejectedValue(new GenerateEsqlNoDataError('No index found'));

    const node = await createNode();
    const result = await node(createState());

    expect(result).toEqual({
      rejectionReason: { code: 'NO_DATA', message: 'No index found' },
    });
  });
});
