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
  spaceId?: string;
}

/**
 * Handles setting up the usage of Stack Connectors for Response Actions and normalizes usage of
 * Connector's Sub-Actions plugin between the `ActionsClient` and the `IUnsecuredActionsClient`
 * client interfaces. It also provides better typing support.
 */
export class NormalizedExternalConnectorClient {
  private connectorTypeId: string | undefined;

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

  constructor(
    protected readonly connectorsClient: ActionsClient | IUnsecuredActionsClient,
    protected readonly log: Logger,
    protected readonly options?: {
      /** Used by `.execute()` when the `IUnsecuredActionsClient` is passed in */
      relatedSavedObjects?: RelatedSavedObjects;
    }
  ) {}

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
    spaceId = 'default',
    params,
  }: NormalizedExternalConnectorClientExecuteOptions<TParams>): Promise<
    ActionTypeExecutorResult<TResponse>
  > {
    this.ensureSetupDone();
    const { id: connectorId } = await this.getConnectorInstance();

    if (this.isUnsecuredActionsClient(this.connectorsClient)) {
      return this.connectorsClient.execute({
        requesterId: 'background_task',
        id: connectorId,
        spaceId,
        params,
        relatedSavedObjects: this.options?.relatedSavedObjects,
      }) as Promise<ActionTypeExecutorResult<TResponse>>;
    }

    return this.connectorsClient.execute({
      actionId: connectorId,
      params,
    }) as Promise<ActionTypeExecutorResult<TResponse>>;
  }

  protected async getAll(spaceId: string = 'default'): ReturnType<ActionsClient['getAll']> {
    this.ensureSetupDone();
    if (this.isUnsecuredActionsClient(this.connectorsClient)) {
      return this.connectorsClient.getAll(spaceId);
    }

    return this.connectorsClient.getAll();
  }
}
