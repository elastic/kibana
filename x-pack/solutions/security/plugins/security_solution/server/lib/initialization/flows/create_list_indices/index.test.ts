/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext } from '../../types';
import { createListIndicesInitializationFlow } from '.';

const createMockInitializationFlowContext = (listsContext: unknown): InitializationFlowContext =>
  ({
    requestHandlerContext: {
      lists: listsContext,
    },
    logger: loggerMock.create(),
  } as unknown as InitializationFlowContext);

describe('createListIndicesInitializationFlow', () => {
  it('has the correct id', () => {
    expect(createListIndicesInitializationFlow.id).toBe(INITIALIZATION_FLOW_CREATE_LIST_INDICES);
  });

  it('should be configured to run in parallel', () => {
    expect(createListIndicesInitializationFlow.runFirst).toBeUndefined();
  });

  describe('runFlow', () => {
    it('throws when the lists plugin context is unavailable', async () => {
      const context = createMockInitializationFlowContext(undefined);

      await expect(createListIndicesInitializationFlow.runFlow(context)).rejects.toThrow(
        'lists plugin is not available'
      );
    });

    describe('when both data streams already exist', () => {
      it('returns ready without setting templates or creating data streams', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListDataStreamExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(true);
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListItemTemplateExists.mockResolvedValue(true);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        const result = await createListIndicesInitializationFlow.runFlow(context);

        expect(result).toEqual({ status: INITIALIZATION_FLOW_STATUS_READY, payload: null });
        expect(listClient.setListTemplate).not.toHaveBeenCalled();
        expect(listClient.setListItemTemplate).not.toHaveBeenCalled();
        expect(listClient.createListDataStream).not.toHaveBeenCalled();
        expect(listClient.createListItemDataStream).not.toHaveBeenCalled();
      });
    });

    describe('template provisioning', () => {
      it('calls setListTemplate when list template does not exist', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListTemplateExists.mockResolvedValue(false);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.setListTemplate).toHaveBeenCalledTimes(1);
      });

      it('calls setListTemplate when list data stream does not exist (even if template exists)', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListDataStreamExists.mockResolvedValue(false);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.setListTemplate).toHaveBeenCalledTimes(1);
      });

      it('skips setListTemplate when both list template and list data stream exist', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListDataStreamExists.mockResolvedValue(true);
        listClient.getListItemTemplateExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(true);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.setListTemplate).not.toHaveBeenCalled();
      });

      it('calls setListItemTemplate when list item template does not exist', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListItemTemplateExists.mockResolvedValue(false);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.setListItemTemplate).toHaveBeenCalledTimes(1);
      });

      it('calls setListItemTemplate when list item data stream does not exist (even if template exists)', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListItemTemplateExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(false);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.setListItemTemplate).toHaveBeenCalledTimes(1);
      });

      it('skips setListItemTemplate when both list item template and list item data stream exist', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListTemplateExists.mockResolvedValue(true);
        listClient.getListItemTemplateExists.mockResolvedValue(true);
        listClient.getListDataStreamExists.mockResolvedValue(true);
        listClient.getListItemDataStreamExists.mockResolvedValue(true);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.setListItemTemplate).not.toHaveBeenCalled();
      });
    });

    describe('data stream creation', () => {
      it('creates the list data stream when no existing index', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListIndexExists.mockResolvedValue(false);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.createListDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.migrateListIndexToDataStream).not.toHaveBeenCalled();
      });

      it('migrates the list index to a data stream when an existing index is present', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListIndexExists.mockResolvedValue(true);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.migrateListIndexToDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.createListDataStream).not.toHaveBeenCalled();
      });

      it('creates the list item data stream when no existing index', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListItemIndexExists.mockResolvedValue(false);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.createListItemDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.migrateListItemIndexToDataStream).not.toHaveBeenCalled();
      });

      it('migrates the list item index to a data stream when an existing index is present', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListItemIndexExists.mockResolvedValue(true);

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(listClient.migrateListItemIndexToDataStream).toHaveBeenCalledTimes(1);
        expect(listClient.createListItemDataStream).not.toHaveBeenCalled();
      });

      it('logs a success message after initializing list indices', async () => {
        const listClient = getListClientMock() as ListClientMock;

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await createListIndicesInitializationFlow.runFlow(context);

        expect(context.logger.info).toHaveBeenCalledWith('List indices initialized successfully');
      });
    });

    describe('error handling', () => {
      it('swallows resource_already_exists_exception during list data stream creation', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.createListDataStream.mockRejectedValue(
          new Error('resource_already_exists_exception: index already exists')
        );

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await expect(createListIndicesInitializationFlow.runFlow(context)).resolves.toEqual({
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: null,
        });
      });

      it('swallows resource_already_exists_exception during list item data stream creation', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.createListItemDataStream.mockRejectedValue(
          new Error('resource_already_exists_exception: index already exists')
        );

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await expect(createListIndicesInitializationFlow.runFlow(context)).resolves.toEqual({
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: null,
        });
      });

      it('swallows resource_already_exists_exception during list index migration', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListIndexExists.mockResolvedValue(true);
        listClient.migrateListIndexToDataStream.mockRejectedValue(
          new Error('resource_already_exists_exception: data stream already exists')
        );

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await expect(createListIndicesInitializationFlow.runFlow(context)).resolves.toEqual({
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: null,
        });
      });

      it('re-throws non-resource_already_exists errors from list data stream creation', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListIndexExists.mockResolvedValue(false);
        listClient.createListDataStream.mockRejectedValue(new Error('connection refused'));

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await expect(createListIndicesInitializationFlow.runFlow(context)).rejects.toThrow(
          'connection refused'
        );
      });

      it('re-throws non-resource_already_exists errors from list item data stream creation', async () => {
        const listClient = getListClientMock() as ListClientMock;
        listClient.getListItemIndexExists.mockResolvedValue(false);
        listClient.createListItemDataStream.mockRejectedValue(new Error('cluster unavailable'));

        const context = createMockInitializationFlowContext({
          getInternalListClient: () => listClient,
        });
        await expect(createListIndicesInitializationFlow.runFlow(context)).rejects.toThrow(
          'cluster unavailable'
        );
      });
    });
  });
});
