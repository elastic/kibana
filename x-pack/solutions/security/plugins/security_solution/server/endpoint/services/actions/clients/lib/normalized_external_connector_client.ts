/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { IUnsecuredActionsClient, ActionsClient } from '@kbn/actions-plugin/server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { Logger } from '@kbn/logging';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import { once } from 'lodash';
import type { RelatedSavedObjects } from '@kbn/actions-plugin/server/lib';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { stringify } from '../../../../utils/stringify';
import { ResponseActionsClientError, ResponseActionsConnectorNotConfiguredError } from '../errors';

export interface NormalizedExternalConnectorClientExecuteOptions<
  TParams extends Record<string, any> = Record<string, any>,
  TSubAction = unknown
> {
  params: {
    subAction: TSubAction;
    subActionParams: TParams;
  };
}

/**
 * Handles setting up the usage of Stack Connectors for Response Actions and normalizes usage of
 * Connector's Sub-Actions plugin between the `ActionsClient` and the `IUnsecuredActionsClient`
 * client interfaces. It also provides better typing support.
 */
export class NormalizedExternalConnectorClient {
  private connectorTypeId: string | undefined;

  constructor(
    protected readonly connectorsClient: ActionsClient | IUnsecuredActionsClient,
    protected readonly log: Logger,
    protected readonly options?: {
      /**
       * The space ID to be used when the `IUnsecuredActionsClient` is used.
       * This option is **REQUIRED** when using the `IUnsecuredActionsClient`
       * correctors client.
       */
      spaceId?: string;
      /** Used by `.execute()` when the `IUnsecuredActionsClient` is passed in */
      relatedSavedObjects?: RelatedSavedObjects;
    }
  ) {
    if (this.isUnsecuredActionsClient(connectorsClient) && !options?.spaceId) {
      throw new ResponseActionsClientError(
        `Initialization of NormalizedExternalConnectorClient with an unsecured connectors client requires an 'options.spaceId' to be defined`
      );
    }
  }

  protected readonly getConnectorInstance: () => Promise<ConnectorWithExtraFindData> = once(
    async () => {
      this.ensureSetupDone();
      let connectorList: ConnectorWithExtraFindData[] = [];
      const connectorTypeId = this.connectorTypeId as string;

      try {
        connectorList = await this.getAll();
      } catch (err) {
        throw new ResponseActionsClientError(
          `Unable to retrieve list of stack connectors in order to find one for [${connectorTypeId}]: ${err.message}`,
          // failure here is likely due to Authz, but because we don't have a good way to determine that,
          // the `statusCode` below is set to `400` instead of `401`.
          400,
          err
        );
      }
      const connector = connectorList.find(({ actionTypeId, isDeprecated, isMissingSecrets }) => {
        return actionTypeId === connectorTypeId && !isDeprecated && !isMissingSecrets;
      });

      if (!connector) {
        this.log.debug(() => stringify(connectorList));
        throw new ResponseActionsConnectorNotConfiguredError(connectorTypeId);
      }

      this.log.debug(
        `Using [${this.connectorTypeId}] stack connector: "${connector.name}" (ID: ${connector.id})`
      );

      return connector;
    }
  );

  private ensureSetupDone(): void {
    if (!this.connectorTypeId) {
      throw new ResponseActionsClientError(`Instance has not been .setup()!`);
    }
  }

  private isUnsecuredActionsClient(
    client: ActionsClient | IUnsecuredActionsClient
  ): client is IUnsecuredActionsClient {
    // The methods below only exist in the normal `ActionsClient`
    return !('create' in client) && !('delete' in client) && !('update' in client);
  }

  /**
   * Sets up the class instance for use. Must be called prior to using methods of this class
   * @param connectorTypeId
   */
  public setup(connectorTypeId: string) {
    if (this.connectorTypeId) {
      throw new ResponseActionsClientError(
        `setup() has already been called with connector [${connectorTypeId}]`
      );
    }

    this.connectorTypeId = connectorTypeId;
  }

  public async execute<
    TResponse = unknown,
    TParams extends Record<string, any> = Record<string, any>
  >({
    params,
  }: NormalizedExternalConnectorClientExecuteOptions<TParams>): Promise<
    ActionTypeExecutorResult<TResponse>
  > {
    this.ensureSetupDone();
    const {
      id: connectorId,
      name: connectorName,
      actionTypeId: connectorTypeId,
    } = await this.getConnectorInstance();

    const catchAndThrow = (err: Error) => {
      throw new ResponseActionsClientError(
        `Attempt to execute [${params.subAction}] with connector [Name: ${connectorName} | Type: ${connectorTypeId} | ID: ${connectorId})] failed with : ${err.message}`,
        500,
        err
      );
    };

    if (this.isUnsecuredActionsClient(this.connectorsClient)) {
      const spaceId = this.options?.spaceId ?? DEFAULT_SPACE_ID;

      this.log.debug(
        `Executing  action [${params.subAction}] of connector [${connectorTypeId}] (unsecured) in space [${this.options?.spaceId}]`
      );

      return this.connectorsClient
        .execute({
          requesterId: 'background_task',
          id: connectorId,
          spaceId,
          params,
          relatedSavedObjects: this.options?.relatedSavedObjects,
        })
        .catch(catchAndThrow) as Promise<ActionTypeExecutorResult<TResponse>>;
    }

    this.log.debug(`Executing  action [${params.subAction}] of connector [${connectorTypeId}]`);

    return this.connectorsClient
      .execute({
        actionId: connectorId,
        params,
      })
      .catch(catchAndThrow) as Promise<ActionTypeExecutorResult<TResponse>>;
  }

  protected async getAll(): ReturnType<ActionsClient['getAll']> {
    this.ensureSetupDone();
    if (this.isUnsecuredActionsClient(this.connectorsClient)) {
      if (!this.options?.spaceId) {
        throw new ResponseActionsClientError('options.spaceId is required');
      }

      return this.connectorsClient.getAll(this.options.spaceId);
    }

    return this.connectorsClient.getAll();
  }
}
