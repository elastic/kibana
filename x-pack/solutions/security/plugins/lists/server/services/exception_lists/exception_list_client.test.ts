/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import type { ExtensionPointStorageContextMock } from '../extension_points/extension_point_storage.mock';
import { createExtensionPointStorageMock } from '../extension_points/extension_point_storage.mock';
import type { ExtensionPointCallbackDataArgument } from '../extension_points';

import {
  getCreateExceptionListItemOptionsMock,
  getExceptionListClientMock,
  getExceptionListSavedObjectClientMock,
  getUpdateExceptionListItemOptionsMock,
  toReadable,
} from './exception_list_client.mock';
import { ExceptionListClient } from './exception_list_client';
import { DataValidationError } from './utils/errors';

describe('exception_list_client', () => {
  describe('Mock client checks', () => {
    test('it returns the exception list as expected', async () => {
      const mock = getExceptionListClientMock();
      const list = await mock.getExceptionList({
        id: '123',
        listId: '123',
        namespaceType: 'single',
      });
      expect(list).toEqual(getExceptionListSchemaMock());
    });

    test('it returns the the exception list item as expected', async () => {
      const mock = getExceptionListClientMock();
      const listItem = await mock.getExceptionListItem({
        id: '123',
        itemId: '123',
        namespaceType: 'single',
      });
      expect(listItem).toEqual(getExceptionListItemSchemaMock());
    });
  });

  describe('server extension points execution', () => {
    let extensionPointStorageContext: ExtensionPointStorageContextMock;
    let exceptionListClient: ExceptionListClient;
    let kibanaRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;

    beforeEach(() => {
      extensionPointStorageContext = createExtensionPointStorageMock();
      kibanaRequest = httpServerMock.createKibanaRequest();
    });

    it('should initialize class instance with `enableServerExtensionPoints` enabled by default', async () => {
      exceptionListClient = new ExceptionListClient({
        request: kibanaRequest,
        savedObjectsClient: getExceptionListSavedObjectClientMock(),
        serverExtensionsClient: extensionPointStorageContext.extensionPointStorage.getClient(),
        user: 'elastic',
      });

      await exceptionListClient.createExceptionListItem(getCreateExceptionListItemOptionsMock());

      expect(extensionPointStorageContext.exceptionPreCreate.callback).toHaveBeenCalled();
    });

    // Test client methods that use the `pipeRun()` method of the ExtensionPointStorageClient` and
    // receive an exception item for create or update
    describe.each([
      [
        'createExceptionListItem',
        (): ReturnType<ExceptionListClient['createExceptionListItem']> => {
          return exceptionListClient.createExceptionListItem(
            getCreateExceptionListItemOptionsMock()
          );
        },
        (): ExtensionPointStorageContextMock['exceptionPreCreate']['callback'] => {
          return extensionPointStorageContext.exceptionPreCreate.callback;
        },
      ],

      [
        'updateExceptionListItem',
        (): ReturnType<ExceptionListClient['updateExceptionListItem']> => {
          return exceptionListClient.updateExceptionListItem(
            getUpdateExceptionListItemOptionsMock()
          );
        },
        (): ExtensionPointStorageContextMock['exceptionPreUpdate']['callback'] => {
          return extensionPointStorageContext.exceptionPreUpdate.callback;
        },
      ],

      [
        'createEndpointListItem',
        (): ReturnType<ExceptionListClient['createEndpointListItem']> => {
          const mockOptions = getCreateExceptionListItemOptionsMock();
          return exceptionListClient.createEndpointListItem({
            comments: mockOptions.comments,
            description: mockOptions.description,
            entries: mockOptions.entries,
            itemId: mockOptions.itemId,
            meta: mockOptions.meta,
            name: mockOptions.name,
            osTypes: mockOptions.osTypes,
            tags: mockOptions.tags,
            type: mockOptions.type,
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreCreate']['callback'] => {
          return extensionPointStorageContext.exceptionPreCreate.callback;
        },
      ],

      [
        'updateEndpointListItem',
        (): ReturnType<ExceptionListClient['updateEndpointListItem']> => {
          const mockOptions = getUpdateExceptionListItemOptionsMock();
          return exceptionListClient.updateEndpointListItem({
            _version: mockOptions._version,
            comments: mockOptions.comments,
            description: mockOptions.description,
            entries: mockOptions.entries,
            id: mockOptions.id,
            itemId: mockOptions.itemId,
            meta: mockOptions.meta,
            name: mockOptions.name,
            osTypes: mockOptions.osTypes,
            tags: mockOptions.tags,
            type: mockOptions.type,
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreUpdate']['callback'] => {
          return extensionPointStorageContext.exceptionPreUpdate.callback;
        },
      ],
    ])(
      'and calling `ExceptionListClient#%s()`',
      (methodName, callExceptionListClientMethod, getExtensionPointCallback) => {
        describe('and server extension points are enabled', () => {
          beforeEach(() => {
            exceptionListClient = new ExceptionListClient({
              request: kibanaRequest,
              savedObjectsClient: getExceptionListSavedObjectClientMock(),
              serverExtensionsClient:
                extensionPointStorageContext.extensionPointStorage.getClient(),
              user: 'elastic',
            });
          });

          it('should execute extension point callbacks', async () => {
            await callExceptionListClientMethod();

            expect(getExtensionPointCallback()).toHaveBeenCalled();
          });

          it('should provide `context` object to extension point callbacks', async () => {
            await callExceptionListClientMethod();

            expect(getExtensionPointCallback().mock.calls[0][0].context).toEqual({
              exceptionListClient: expect.any(ExceptionListClient),
              request: kibanaRequest,
            });
          });

          it('should error if extension point callback throws an error', async () => {
            const error = new Error('foo');
            const extensionCallback = getExtensionPointCallback();

            extensionCallback.mockImplementation(async () => {
              throw error;
            });

            await expect(callExceptionListClientMethod()).rejects.toBe(error);
          });

          it('should validate extension point callback returned data and throw if not valid', async () => {
            const extensionPointCallback = getExtensionPointCallback();
            extensionPointCallback.mockImplementation(async (args) => {
              const {
                data: { entries, ...rest },
                // @ts-expect-error upgrade typescript v5.9.3
              } = args as { data: ExtensionPointCallbackDataArgument };

              expect(entries).toBeTruthy(); // Test entries to exist since we exclude it.
              return rest as ExtensionPointCallbackDataArgument;
            });

            const methodResponsePromise = callExceptionListClientMethod();

            await expect(methodResponsePromise).rejects.toBeInstanceOf(DataValidationError);
            await expect(methodResponsePromise).rejects.toEqual(
              expect.objectContaining({
                reason: ['Invalid value "undefined" supplied to "entries"'],
              })
            );
            expect(extensionPointStorageContext.logger.error).toHaveBeenCalled();
          });

          it('should use data returned from extension point callbacks when saving', async () => {
            await expect(callExceptionListClientMethod()).resolves.toEqual(
              expect.objectContaining({
                name: 'some name-1',
              })
            );
          });
        });

        describe('and server extension points are DISABLED', () => {
          beforeEach(() => {
            exceptionListClient = new ExceptionListClient({
              enableServerExtensionPoints: false,
              request: kibanaRequest,
              savedObjectsClient: getExceptionListSavedObjectClientMock(),
              serverExtensionsClient:
                extensionPointStorageContext.extensionPointStorage.getClient(),
              user: 'elastic',
            });
          });

          it('should NOT call server extension points', async () => {
            await callExceptionListClientMethod();

            expect(getExtensionPointCallback()).not.toHaveBeenCalled();
          });
        });
      }
    );

    // Test Client methods that use `pipeRun()` for executing extension points, but don't mutate it (access only)
    describe.each([
      [
        'getExceptionListItem',
        (): ReturnType<ExceptionListClient['getExceptionListItem']> => {
          return exceptionListClient.getExceptionListItem({
            id: '1',
            itemId: '1',
            namespaceType: 'agnostic',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreGetOne']['callback'] => {
          return extensionPointStorageContext.exceptionPreGetOne.callback;
        },
      ],
      [
        'findExceptionListItem',
        (): ReturnType<ExceptionListClient['findEndpointListItem']> => {
          return exceptionListClient.findExceptionListItem({
            filter: undefined,
            listId: 'one',
            namespaceType: 'agnostic',
            page: 1,
            perPage: 1,
            pit: undefined,
            searchAfter: undefined,
            sortField: 'name',
            sortOrder: 'asc',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreSingleListFind']['callback'] => {
          return extensionPointStorageContext.exceptionPreSingleListFind.callback;
        },
      ],
      [
        'findExceptionListsItem',
        (): ReturnType<ExceptionListClient['findExceptionListsItem']> => {
          return exceptionListClient.findExceptionListsItem({
            filter: [],
            listId: ['one'],
            namespaceType: ['agnostic'],
            page: 1,
            perPage: 1,
            pit: undefined,
            searchAfter: undefined,
            sortField: 'name',
            sortOrder: 'asc',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreMultiListFind']['callback'] => {
          return extensionPointStorageContext.exceptionPreMultiListFind.callback;
        },
      ],
      [
        'exportExceptionListAndItems',
        (): ReturnType<ExceptionListClient['exportExceptionListAndItems']> => {
          return exceptionListClient.exportExceptionListAndItems({
            id: '1',
            includeExpiredExceptions: true,
            listId: '1',
            namespaceType: 'agnostic',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreExport']['callback'] => {
          return extensionPointStorageContext.exceptionPreExport.callback;
        },
      ],
      [
        'getExceptionListSummary',
        (): ReturnType<ExceptionListClient['getExceptionListSummary']> => {
          return exceptionListClient.getExceptionListSummary({
            filter: undefined,
            id: '1',
            listId: '1',
            namespaceType: 'agnostic',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreSummary']['callback'] => {
          return extensionPointStorageContext.exceptionPreSummary.callback;
        },
      ],
      [
        'deleteExceptionListItem',
        (): ReturnType<ExceptionListClient['deleteExceptionListItem']> => {
          return exceptionListClient.deleteExceptionListItem({
            id: '1',
            itemId: '1',
            namespaceType: 'agnostic',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreDelete']['callback'] => {
          return extensionPointStorageContext.exceptionPreDelete.callback;
        },
      ],
      [
        'deleteExceptionListItemById',
        (): ReturnType<ExceptionListClient['deleteExceptionListItemById']> => {
          return exceptionListClient.deleteExceptionListItemById({
            id: '1',
            namespaceType: 'agnostic',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreDelete']['callback'] => {
          return extensionPointStorageContext.exceptionPreDelete.callback;
        },
      ],
      [
        'bulkDeleteExceptionListItems',
        (): ReturnType<ExceptionListClient['bulkDeleteExceptionListItems']> => {
          return exceptionListClient.bulkDeleteExceptionListItems({
            ids: ['1', '2', '3'],
            namespaceType: 'agnostic',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreDelete']['callback'] => {
          return extensionPointStorageContext.exceptionPreDelete.callback;
        },
      ],
      [
        'getEndpointListItem',
        (): ReturnType<ExceptionListClient['getEndpointListItem']> => {
          return exceptionListClient.getEndpointListItem({
            id: '1',
            itemId: '1',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreGetOne']['callback'] => {
          return extensionPointStorageContext.exceptionPreGetOne.callback;
        },
      ],
      [
        'deleteEndpointListItem',
        (): ReturnType<ExceptionListClient['deleteEndpointListItem']> => {
          return exceptionListClient.deleteEndpointListItem({
            id: '1',
            itemId: '1',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreDelete']['callback'] => {
          return extensionPointStorageContext.exceptionPreDelete.callback;
        },
      ],
      [
        'findEndpointListItem',
        (): ReturnType<ExceptionListClient['findEndpointListItem']> => {
          return exceptionListClient.findEndpointListItem({
            filter: undefined,
            page: 1,
            perPage: 1,
            pit: undefined,
            search: undefined,
            searchAfter: undefined,
            sortField: 'name',
            sortOrder: 'asc',
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreSingleListFind']['callback'] => {
          return extensionPointStorageContext.exceptionPreSingleListFind.callback;
        },
      ],
      [
        'importExceptionListAndItems',
        (): ReturnType<ExceptionListClient['importExceptionListAndItems']> => {
          return exceptionListClient.importExceptionListAndItems({
            exceptionsToImport: toReadable([getExceptionListItemSchemaMock()]),
            generateNewListId: false,
            maxExceptionsImportSize: 10_000,
            overwrite: true,
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreImport']['callback'] => {
          return extensionPointStorageContext.exceptionPreImport.callback;
        },
      ],
      [
        'importExceptionListAndItemsAsArray',
        (): ReturnType<ExceptionListClient['importExceptionListAndItemsAsArray']> => {
          return exceptionListClient.importExceptionListAndItemsAsArray({
            exceptionsToImport: [getExceptionListItemSchemaMock()],
            maxExceptionsImportSize: 10_000,
            overwrite: true,
          });
        },
        (): ExtensionPointStorageContextMock['exceptionPreImport']['callback'] => {
          return extensionPointStorageContext.exceptionPreImport.callback;
        },
      ],
    ])(
      'and calling `ExceptionListClient#%s()`',
      (methodName, callExceptionListClientMethod, getExtensionPointCallback) => {
        beforeEach(() => {
          exceptionListClient = new ExceptionListClient({
            request: kibanaRequest,
            savedObjectsClient: getExceptionListSavedObjectClientMock(),
            serverExtensionsClient: extensionPointStorageContext.extensionPointStorage.getClient(),
            user: 'elastic',
          });
        });

        it('should execute extension point callbacks', async () => {
          await callExceptionListClientMethod();

          expect(getExtensionPointCallback()).toHaveBeenCalled();
        });

        it('should provide `context` object to extension point callbacks', async () => {
          await callExceptionListClientMethod();

          expect(getExtensionPointCallback().mock.calls[0][0].context).toEqual({
            exceptionListClient: expect.any(ExceptionListClient),
            request: kibanaRequest,
          });
        });

        it('should error if extension point callback throws an error', async () => {
          const error = new Error('foo');
          const extensionCallback = getExtensionPointCallback();

          extensionCallback.mockImplementation(async () => {
            throw error;
          });

          await expect(callExceptionListClientMethod()).rejects.toBe(error);
        });

        describe('and server extension points are DISABLED', () => {
          beforeEach(() => {
            exceptionListClient = new ExceptionListClient({
              enableServerExtensionPoints: false,
              request: kibanaRequest,
              savedObjectsClient: getExceptionListSavedObjectClientMock(),
              serverExtensionsClient:
                extensionPointStorageContext.extensionPointStorage.getClient(),
              user: 'elastic',
            });
          });

          it('should NOT call server extension points', async () => {
            await callExceptionListClientMethod();

            expect(getExtensionPointCallback()).not.toHaveBeenCalled();
          });
        });
      }
    );

    describe('and calling `ExceptionListClient#bulkDeleteExceptionList()`', () => {
      let savedObjectsClient: ReturnType<typeof getExceptionListSavedObjectClientMock>;

      const listContainerSavedObject = (id: string): unknown => {
        const list = getExceptionListSchemaMock();
        return {
          attributes: {
            ...list,
            list_id: `list-id-${id}`,
            list_type: 'list',
          },
          id,
          references: [],
          type: 'exception-list',
          updated_at: list.updated_at,
          version: list._version,
        };
      };

      beforeEach(() => {
        savedObjectsClient = getExceptionListSavedObjectClientMock();
        savedObjectsClient.bulkGet.mockResolvedValue({
          saved_objects: [listContainerSavedObject('so-1'), listContainerSavedObject('so-2')],
        } as never);
        savedObjectsClient.delete.mockResolvedValue({} as never);

        exceptionListClient = new ExceptionListClient({
          request: kibanaRequest,
          savedObjectsClient,
          serverExtensionsClient: extensionPointStorageContext.extensionPointStorage.getClient(),
          user: 'elastic',
        });
      });

      it('should execute the extension point once per list with `context` and pristine `blockedBy`', async () => {
        const result = await exceptionListClient.bulkDeleteExceptionList({
          ids: ['so-1', 'so-2'],
          namespaceType: 'single',
        });

        const { callback } = extensionPointStorageContext.exceptionPreDeleteList;
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback.mock.calls[0][0].context).toEqual({
          exceptionListClient: expect.any(ExceptionListClient),
          request: kibanaRequest,
        });
        expect(callback.mock.calls[0][0].data).toEqual(
          expect.objectContaining({
            blockedBy: [],
            list: expect.objectContaining({ id: 'so-1' }),
            namespaceType: 'single',
          })
        );
        expect(result.success).toBe(true);
        expect(savedObjectsClient.delete).toHaveBeenCalledTimes(2);
      });

      it('should delete every list when NO extension point is registered, because `lists` alone enforces no rule-reference guard', async () => {
        extensionPointStorageContext.extensionPointStorage.clear();

        const result = await exceptionListClient.bulkDeleteExceptionList({
          ids: ['so-1', 'so-2'],
          namespaceType: 'single',
        });

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(2);
        expect(result.errors).toEqual([]);
        expect(savedObjectsClient.delete).toHaveBeenCalledTimes(2);
      });

      it('should NOT call the extension point when server extension points are DISABLED', async () => {
        exceptionListClient = new ExceptionListClient({
          enableServerExtensionPoints: false,
          request: kibanaRequest,
          savedObjectsClient,
          serverExtensionsClient: extensionPointStorageContext.extensionPointStorage.getClient(),
          user: 'elastic',
        });

        const result = await exceptionListClient.bulkDeleteExceptionList({
          ids: ['so-1', 'so-2'],
          namespaceType: 'single',
        });

        expect(extensionPointStorageContext.exceptionPreDeleteList.callback).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should report a per-list 409 conflict when the extension point returns blockers', async () => {
        extensionPointStorageContext.exceptionPreDeleteList.callback.mockImplementation(
          async ({ data }) => {
            if (data.list.id === 'so-1') {
              return {
                ...data,
                blockedBy: [{ id: 'rule-so-1', name: 'Some Rule', rule_id: 'rule-1' }],
              };
            }
            return data;
          }
        );

        const result = await exceptionListClient.bulkDeleteExceptionList({
          ids: ['so-1', 'so-2'],
          namespaceType: 'single',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toEqual([
          expect.objectContaining({
            lists: [{ id: 'so-1', list_id: 'list-id-so-1' }],
            rule_references: [{ id: 'rule-so-1', name: 'Some Rule', rule_id: 'rule-1' }],
            status_code: 409,
          }),
        ]);
        expect(result.results).toEqual([expect.objectContaining({ id: 'so-2' })]);
        expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
        expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-2');
      });

      it('should report a per-list error and not delete when the extension point returns malformed `blockedBy`', async () => {
        extensionPointStorageContext.exceptionPreDeleteList.callback.mockImplementation(
          async ({ data }) =>
            ({
              ...data,
              blockedBy: [{ bogus: true }],
            } as unknown as ExtensionPointCallbackDataArgument)
        );

        const result = await exceptionListClient.bulkDeleteExceptionList({
          ids: ['so-1', 'so-2'],
          namespaceType: 'single',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].message).toContain('malformed [blockedBy]');
        expect(savedObjectsClient.delete).not.toHaveBeenCalled();
        expect(extensionPointStorageContext.logger.error).toHaveBeenCalled();
      });
    });
  });
});
