/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttackDiscoveryCreateProps,
  AttackDiscoveryUpdateProps,
  AttackDiscoveryResponse,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { findAllAttackDiscoveries } from './find_all_attack_discoveries/find_all_attack_discoveries';
import { findAttackDiscoveryByConnectorId } from './find_attack_discovery_by_connector_id/find_attack_discovery_by_connector_id';
import { updateAttackDiscovery } from './update_attack_discovery/update_attack_discovery';
import { createAttackDiscovery } from './create_attack_discovery/create_attack_discovery';
import { getAttackDiscovery } from './get_attack_discovery/get_attack_discovery';
import {
  AIAssistantDataClient,
  AIAssistantDataClientParams,
} from '../../../ai_assistant_data_clients';

type AttackDiscoveryDataClientParams = AIAssistantDataClientParams;

export class AttackDiscoveryDataClient extends AIAssistantDataClient {
  constructor(public readonly options: AttackDiscoveryDataClientParams) {
    super(options);
  }

  /**
   * Fetches an attack discovery
   * @param options
   * @param options.id The existing attack discovery id.
   * @param options.authenticatedUser Current authenticated user.
   * @returns The attack discovery response
   */
  public getAttackDiscovery = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser,
    });
  };

  /**
   * Creates an attack discovery, if given at least the "apiConfig"
   * @param options
   * @param options.attackDiscoveryCreate
   * @param options.authenticatedUser
   * @returns The Attack Discovery created
   */
  public createAttackDiscovery = async ({
    attackDiscoveryCreate,
    authenticatedUser,
  }: {
    attackDiscoveryCreate: AttackDiscoveryCreateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return createAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      spaceId: this.spaceId,
      user: authenticatedUser,
      attackDiscoveryCreate,
    });
  };

  /**
   * Find attack discovery by apiConfig connectorId
   * @param options
   * @param options.connectorId
   * @param options.authenticatedUser
   * @returns The Attack Discovery found
   */
  public findAttackDiscoveryByConnectorId = async ({
    connectorId,
    authenticatedUser,
  }: {
    connectorId: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findAttackDiscoveryByConnectorId({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      connectorId,
      user: authenticatedUser,
    });
  };

  /**
   * Finds all attack discovery for authenticated user
   * @param options
   * @param options.authenticatedUser
   * @returns The Attack Discovery
   */
  public findAllAttackDiscoveries = async ({
    authenticatedUser,
  }: {
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse[]> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findAllAttackDiscoveries({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      user: authenticatedUser,
    });
  };

  /**
   * Updates an attack discovery
   * @param options
   * @param options.attackDiscoveryUpdateProps
   * @param options.authenticatedUser
   */
  public updateAttackDiscovery = async ({
    attackDiscoveryUpdateProps,
    authenticatedUser,
  }: {
    attackDiscoveryUpdateProps: AttackDiscoveryUpdateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return updateAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: attackDiscoveryUpdateProps.backingIndex,
      attackDiscoveryUpdateProps,
      user: authenticatedUser,
    });
  };
}
