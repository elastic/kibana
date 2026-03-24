/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, AuthenticatedUser } from '@kbn/core/server';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  getCreateConversationSchemaMock,
  getUpdateConversationSchemaMock,
} from '../../__mocks__/conversations_schema.mock';
import { authenticatedUser } from '../../__mocks__/user';
import { DocumentsDataWriter } from './documents_data_writer';

describe('DocumentsDataWriter', () => {
  const mockUser1 = authenticatedUser;

  // Common test constants
  const COMMON_SEARCH_PARAMS = {
    _source: false,
    ignore_unavailable: true,
    seq_no_primary_term: true,
    size: 1000,
  };

  const USER_FILTER = {
    bool: {
      should: [
        {
          bool: {
            must_not: {
              nested: {
                path: 'users',
                query: {
                  exists: {
                    field: 'users',
                  },
                },
              },
            },
          },
        },
        {
          nested: {
            path: 'users',
            query: {
              bool: {
                should: [
                  { term: { 'users.id': 'my_profile_uid' } },
                  { term: { 'users.name': 'elastic' } },
                ],
                minimum_should_match: 1,
              },
            },
          },
        },
      ],
    },
  };

  const USER_FILTER_FOR_CONVERSATION = {
    bool: {
      should: [
        {
          bool: {
            must: [
              {
                exists: { field: 'created_by' },
              },
              {
                bool: {
                  should: [
                    { term: { 'created_by.id': 'my_profile_uid' } },
                    { term: { 'created_by.name': 'elastic' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        {
          bool: {
            must: [
              {
                bool: {
                  must_not: [
                    {
                      exists: { field: 'created_by' },
                    },
                  ],
                },
              },
              {
                nested: {
                  path: 'users',
                  query: {
                    bool: {
                      should: [
                        { term: { 'users.id': 'my_profile_uid' } },
                        { term: { 'users.name': 'elastic' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  const USER_WITHOUT_PROFILE_FILTER = {
    bool: {
      should: [
        {
          bool: {
            must_not: {
              nested: {
                path: 'users',
                query: {
                  exists: {
                    field: 'users',
                  },
                },
              },
            },
          },
        },
        {
          nested: {
            path: 'users',
            query: {
              bool: {
                should: [{ term: { 'users.name': 'elastic' } }],
                minimum_should_match: 1,
              },
            },
          },
        },
      ],
    },
  };

  // Helper function to build complete search query
  const buildSearchQuery = (filter?: { bool: { should: unknown[] } }) => ({
    query: {
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  ids: {
                    values: ['1'],
                  },
                },
              ],
            },
          },
        ],
        ...(filter && { filter }),
      },
    },
    ...COMMON_SEARCH_PARAMS,
  });

  describe('#bulk', () => {
    let writer: DocumentsDataWriter;
    let esClientMock: ElasticsearchClient;
    let loggerMock: Logger;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      loggerMock = loggingSystemMock.createLogger();
      writer = new DocumentsDataWriter({
        esClient: esClientMock,
        logger: loggerMock,
        index: 'documents-default',
        spaceId: 'default',
        user: { name: 'test' },
      });
    });

    it('converts a list of documents to an appropriate list of operations', async () => {
      await writer.bulk({
        documentsToCreate: [getCreateConversationSchemaMock(), getCreateConversationSchemaMock()],
        documentsToUpdate: [],
        documentsToDelete: [],
        authenticatedUser: mockUser1,
        getUpdateScript: jest.fn(),
      });

      const { docs_created: docsCreated } = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(docsCreated).toMatchInlineSnapshot(`undefined`);
    });

    it('converts a list of mixed documents operations to an appropriate list of operations', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      await writer.bulk({
        documentsToCreate: [getCreateConversationSchemaMock()],
        documentsToUpdate: [getUpdateConversationSchemaMock()],
        documentsToDelete: ['1'],
        authenticatedUser: mockUser1,
        getUpdateScript: jest.fn(),
      });

      const {
        docs_created: docsCreated,
        docs_deleted: docsDeleted,
        docs_updated: docsUpdated,
      } = (esClientMock.bulk as jest.Mock).mock.lastCall;

      expect(docsCreated).toMatchInlineSnapshot(`undefined`);

      expect(docsUpdated).toMatchInlineSnapshot(`undefined`);

      expect(docsDeleted).toMatchInlineSnapshot(`undefined`);
    });

    it('returns an error if something went wrong', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockRejectedValue(new Error('something went wrong'));

      const { errors } = await writer.bulk({
        documentsToCreate: [],
        documentsToUpdate: [],
        documentsToDelete: ['1'],
        getUpdateScript: jest.fn(),
      });

      expect(errors).toEqual([
        {
          document: {
            id: '',
          },
          message: 'something went wrong',
        },
      ]);
    });

    it('returns the time it took to write the documents', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockResolvedValue({
        took: 123,
        items: [],
      });

      const { took } = await writer.bulk({
        documentsToCreate: [],
        documentsToUpdate: [],
        documentsToDelete: ['1'],
        getUpdateScript: jest.fn(),
      });

      expect(took).toEqual(123);
    });

    it('returns the array of docs deleted', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({
        hits: { hits: [] },
      });
      (esClientMock.bulk as jest.Mock).mockResolvedValue({
        items: [{ delete: { status: 201 } }, { delete: { status: 200 } }],
      });

      const { docs_deleted: docsDeleted } = await writer.bulk({
        documentsToCreate: [],
        documentsToUpdate: [],
        documentsToDelete: ['1', '2'],
        getUpdateScript: jest.fn(),
      });

      expect(docsDeleted.length).toEqual(2);
    });

    describe('when some documents failed to be written', () => {
      beforeEach(() => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: { hits: [] },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          errors: true,
          items: [
            { create: { status: 201 } },
            { create: { status: 500, error: { reason: 'something went wrong' } } },
          ],
        });
      });

      it('returns the number of docs written', async () => {
        const { docs_created: docsCreated } = await writer.bulk({
          documentsToCreate: [getCreateConversationSchemaMock()],
          documentsToUpdate: [],
          documentsToDelete: [],
          authenticatedUser: mockUser1,
          getUpdateScript: jest.fn(),
        });

        expect(docsCreated.length).toEqual(1);
      });

      it('returns the errors', async () => {
        const { errors } = await writer.bulk({
          documentsToCreate: [],
          documentsToUpdate: [],
          documentsToDelete: ['1'],
          getUpdateScript: jest.fn(),
        });

        expect(errors).toEqual([
          {
            document: {
              id: undefined,
            },
            message: 'something went wrong',
            status: 500,
          },
        ]);
      });
    });

    describe('when there are no documents to update', () => {
      it('returns an appropriate response', async () => {
        const response = await writer.bulk({
          getUpdateScript: jest.fn(),
        });
        expect(response).toEqual({
          errors: [],
          docs_created: [],
          docs_deleted: [],
          docs_updated: [],
          took: 0,
        });
      });
    });

    describe('when updating documents in knowledge base index', () => {
      let knowledgeBaseWriter: DocumentsDataWriter;

      beforeEach(() => {
        knowledgeBaseWriter = new DocumentsDataWriter({
          esClient: esClientMock,
          logger: loggerMock,
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
          spaceId: 'default',
          user: { name: 'test' },
        });
      });

      it('uses getFilterByUser for knowledge base documents', async () => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-knowledge-base-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ update: { status: 200, _id: '1' } }],
          took: 10,
        });

        await knowledgeBaseWriter.bulk({
          documentsToUpdate: [{ id: '1', title: 'test' }],
          getUpdateScript: (doc) => ({ doc }),
          authenticatedUser: mockUser1,
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(USER_FILTER),
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
        });
      });
    });

    describe('when updating documents in conversations index', () => {
      let conversationsWriter: DocumentsDataWriter;

      beforeEach(() => {
        conversationsWriter = new DocumentsDataWriter({
          esClient: esClientMock,
          logger: loggerMock,
          index: '.kibana-elastic-ai-assistant-conversations-default',
          spaceId: 'default',
          user: { name: 'test' },
        });
      });

      it('uses getFilterByConversationUser for conversation documents', async () => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-conversations-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ update: { status: 200, _id: '1' } }],
          took: 10,
        });

        await conversationsWriter.bulk({
          documentsToUpdate: [{ id: '1', title: 'test' }],
          getUpdateScript: (doc) => ({ doc }),
          authenticatedUser: mockUser1,
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(USER_FILTER_FOR_CONVERSATION),
          index: '.kibana-elastic-ai-assistant-conversations-default',
        });
      });
    });

    describe('when deleting documents in knowledge base index', () => {
      let knowledgeBaseWriter: DocumentsDataWriter;

      beforeEach(() => {
        knowledgeBaseWriter = new DocumentsDataWriter({
          esClient: esClientMock,
          logger: loggerMock,
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
          spaceId: 'default',
          user: { name: 'test' },
        });
      });

      it('uses getFilterByUser for knowledge base document deletion', async () => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-knowledge-base-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ delete: { status: 200, _id: '1' } }],
          took: 10,
        });

        await knowledgeBaseWriter.bulk({
          documentsToDelete: ['1'],
          authenticatedUser: mockUser1,
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(USER_FILTER),
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
        });
      });
    });

    describe('when deleting documents in conversations index', () => {
      let conversationsWriter: DocumentsDataWriter;

      beforeEach(() => {
        conversationsWriter = new DocumentsDataWriter({
          esClient: esClientMock,
          logger: loggerMock,
          index: '.kibana-elastic-ai-assistant-conversations-default',
          spaceId: 'default',
          user: { name: 'test' },
        });
      });

      it('uses getFilterByConversationUser for conversation document deletion', async () => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-conversations-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ delete: { status: 200, _id: '1' } }],
          took: 10,
        });

        await conversationsWriter.bulk({
          documentsToDelete: ['1'],
          authenticatedUser: mockUser1,
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(USER_FILTER_FOR_CONVERSATION),
          index: '.kibana-elastic-ai-assistant-conversations-default',
        });
      });
    });

    describe('when user has no profile_uid', () => {
      let writerWithoutProfileUid: DocumentsDataWriter;
      const userWithoutProfileUid = {
        username: 'elastic',
        profile_uid: undefined,
        authentication_realm: {
          type: 'my_realm_type',
          name: 'my_realm_name',
        },
      } as AuthenticatedUser;

      beforeEach(() => {
        writerWithoutProfileUid = new DocumentsDataWriter({
          esClient: esClientMock,
          logger: loggerMock,
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
          spaceId: 'default',
          user: { name: 'test' },
        });
      });

      it('only matches on username when profile_uid is not available', async () => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-knowledge-base-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ update: { status: 200, _id: '1' } }],
          took: 10,
        });

        await writerWithoutProfileUid.bulk({
          documentsToUpdate: [{ id: '1', title: 'test' }],
          getUpdateScript: (doc) => ({ doc }),
          authenticatedUser: userWithoutProfileUid,
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(USER_WITHOUT_PROFILE_FILTER),
          index: '.kibana-elastic-ai-assistant-knowledge-base-default',
        });
      });
    });

    describe('when no authenticated user is provided', () => {
      it('does not apply user filtering for knowledge base documents', async () => {
        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-knowledge-base-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ update: { status: 200, _id: '1' } }],
          took: 10,
        });

        await writer.bulk({
          documentsToUpdate: [{ id: '1', title: 'test' }],
          getUpdateScript: (doc) => ({ doc }),
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(),
          index: 'documents-default',
        });
      });

      it('does not apply user filtering for conversation documents', async () => {
        const conversationsWriter = new DocumentsDataWriter({
          esClient: esClientMock,
          logger: loggerMock,
          index: '.kibana-elastic-ai-assistant-conversations-default',
          spaceId: 'default',
          user: { name: 'test' },
        });

        (esClientMock.search as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{ _id: '1', _index: '.kibana-elastic-ai-assistant-conversations-default' }],
          },
        });
        (esClientMock.bulk as jest.Mock).mockResolvedValue({
          items: [{ update: { status: 200, _id: '1' } }],
          took: 10,
        });

        await conversationsWriter.bulk({
          documentsToUpdate: [{ id: '1', title: 'test' }],
          getUpdateScript: (doc) => ({ doc }),
        });

        expect(esClientMock.search).toHaveBeenCalledWith({
          ...buildSearchQuery(),
          index: '.kibana-elastic-ai-assistant-conversations-default',
        });
      });
    });
  });
});
