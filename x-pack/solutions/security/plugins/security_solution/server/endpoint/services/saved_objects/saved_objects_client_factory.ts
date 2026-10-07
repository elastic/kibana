/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any,max-classes-per-file */

import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { brandSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from '../../lib/reference_data';
import { EndpointError } from '../../../../common/endpoint/errors';

type SavedObjectsClientContractKeys = keyof SavedObjectsClientContract;

const RESTRICTED_METHODS: readonly SavedObjectsClientContractKeys[] = [
  'bulkCreate',
  'bulkUpdate',
  'create',
  'createPointInTimeFinder',
  'delete',
  'removeReferencesTo',
  'update',
  'updateObjectsSpaces',
];

export class InternalReadonlySoClientMethodNotAllowedError extends EndpointError {}

export class StrictReadonlySoClientMethodNotAllowedError extends EndpointError {
  constructor(methodName: string) {
    super(`Method [${methodName}] not allowed on readonly SO client`);
    this.name = 'StrictReadonlySoClientMethodNotAllowedError';
  }
}

const STRICT_READONLY_METHOD_CLASSIFICATION: Record<
  keyof SavedObjectsClientContract,
  'read' | 'blocked' | 'wrapped'
> = {
  create: 'blocked',
  bulkCreate: 'blocked',
  update: 'blocked',
  bulkUpdate: 'blocked',
  delete: 'blocked',
  bulkDelete: 'blocked',
  removeReferencesTo: 'blocked',
  updateObjectsSpaces: 'blocked',
  changeOwnership: 'blocked',
  changeAccessMode: 'blocked',
  createPointInTimeFinder: 'blocked',
  asScopedToNamespace: 'wrapped',
  checkConflicts: 'read',
  find: 'read',
  search: 'read',
  esql: 'read',
  bulkGet: 'read',
  get: 'read',
  bulkResolve: 'read',
  resolve: 'read',
  openPointInTimeForType: 'read',
  closePointInTime: 'read',
  collectMultiNamespaceReferences: 'read',
  getCurrentNamespace: 'read',
};

/**
 * Factory service for accessing saved object clients
 */
export class SavedObjectsClientFactory {
  private static includedHiddenTypes = new Set<string>([REFERENCE_DATA_SAVED_OBJECT_TYPE]);

  constructor(private readonly savedObjectsServiceStart: SavedObjectsServiceStart) {}

  /**
   * Add a hidden Saved Object type to the list of types that should be given access by the SO clients created by the SavedObjectsClientFactory.
   * @param soType
   */
  public static addSavedObjectHiddenType(soType: string): void {
    this.includedHiddenTypes.add(soType);
  }

  protected createFakeHttpRequest(spaceId: string = DEFAULT_SPACE_ID): KibanaRequest {
    return kibanaRequestFactory({
      headers: {},
      route: { settings: {} },
      url: { href: {}, hash: '' } as URL,
      raw: { req: { url: '/' } } as any,
      spaceId: brandSpaceId(spaceId),
    });
  }

  protected getHiddenTypes(): string[] {
    return Array.from(
      (this.constructor as typeof SavedObjectsClientFactory).includedHiddenTypes.values()
    );
  }

  protected toReadonly(soClient: SavedObjectsClientContract): SavedObjectsClientContract {
    return new Proxy(soClient, {
      get(
        target: SavedObjectsClientContract,
        methodName: SavedObjectsClientContractKeys,
        receiver: unknown
      ): unknown {
        if (RESTRICTED_METHODS.includes(methodName)) {
          throw new InternalReadonlySoClientMethodNotAllowedError(
            `Method [${methodName}] not allowed on internal readonly SO Client`
          );
        }

        return Reflect.get(target, methodName, receiver);
      },
    }) as SavedObjectsClientContract;
  }

  /**
   * Creates a SavedObjects client that is scoped to a space (default: `Default`)
   */
  createInternalScopedSoClient({
    spaceId = DEFAULT_SPACE_ID,
    readonly = true,
  }: Partial<{ spaceId: string; readonly: boolean }> = {}): SavedObjectsClientContract {
    const soClient = this.savedObjectsServiceStart.getScopedClient(
      this.createFakeHttpRequest(spaceId),
      {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: this.getHiddenTypes(),
      }
    );

    if (readonly) {
      return this.toReadonly(soClient);
    }

    return soClient;
  }

  /**
   * Create a SavedObjects client that is un-scoped to a space and thus can access all
   * data across all spaces.
   *
   * **WARNING:** Use with care!
   */
  createInternalUnscopedSoClient(readonly: boolean = true): SavedObjectsClientContract {
    const soClient = this.savedObjectsServiceStart.getScopedClient(this.createFakeHttpRequest(), {
      excludedExtensions: [SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID],
      includedHiddenTypes: this.getHiddenTypes(),
    });

    if (readonly) {
      return this.toReadonly(soClient);
    }

    return soClient;
  }

  protected toStrictReadonly(soClient: SavedObjectsClientContract): SavedObjectsClientContract {
    const wrap = (client: SavedObjectsClientContract): SavedObjectsClientContract =>
      new Proxy(client, {
        get(
          target: SavedObjectsClientContract,
          property: string | symbol,
          receiver: unknown
        ): unknown {
          if (
            typeof property !== 'string' ||
            !(property in STRICT_READONLY_METHOD_CLASSIFICATION)
          ) {
            return Reflect.get(target, property, receiver);
          }

          const methodName = property as keyof SavedObjectsClientContract;
          const classification = STRICT_READONLY_METHOD_CLASSIFICATION[methodName];

          if (classification === 'blocked') {
            throw new StrictReadonlySoClientMethodNotAllowedError(methodName);
          }

          if (classification === 'wrapped') {
            return (namespace: string): SavedObjectsClientContract =>
              wrap(target.asScopedToNamespace(namespace));
          }

          return Reflect.get(target, methodName, receiver);
        },
      });

    return wrap(soClient);
  }

  createRequestScopedSoClient({
    request,
    readonly = true,
  }: {
    request: KibanaRequest;
    readonly?: boolean;
  }): SavedObjectsClientContract {
    const soClient = this.savedObjectsServiceStart.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    if (readonly) {
      return this.toStrictReadonly(soClient);
    }

    return soClient;
  }
}
