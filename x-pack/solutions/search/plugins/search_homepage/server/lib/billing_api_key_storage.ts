/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import {
  BILLING_API_KEY_TYPE,
  BILLING_API_KEY_ID,
  type BillingApiKeyAttributes,
} from '../saved_objects/billing_api_key';

export interface BillingApiKeyStorageDeps {
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}

export class BillingApiKeyStorage {
  private readonly repo: ISavedObjectsRepository;
  private readonly logger: Logger;

  constructor({ savedObjectsRepository, logger }: BillingApiKeyStorageDeps) {
    this.repo = savedObjectsRepository;
    this.logger = logger;
  }

  async saveApiKey(apiKey: string, organizationId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const data: BillingApiKeyAttributes = {
        apiKey,
        organizationId,
        createdAt: now,
        updatedAt: now,
      };

      await this.repo.create(BILLING_API_KEY_TYPE, data, {
        id: BILLING_API_KEY_ID,
        overwrite: true,
      });

      this.logger.debug('Billing API key saved successfully');
    } catch (error) {
      this.logger.error('Failed to save billing API key', { error });
      throw error;
    }
  }

  async getApiKey(): Promise<BillingApiKeyAttributes | undefined> {
    try {
      const result = await this.repo.get<BillingApiKeyAttributes>(
        BILLING_API_KEY_TYPE,
        BILLING_API_KEY_ID
      );

      return result.attributes;
    } catch (error) {
      if ((error as { isBoom?: boolean })?.isBoom) {
        return undefined;
      }

      this.logger.error('Failed to retrieve billing API key', { error });
      throw error;
    }
  }
}
