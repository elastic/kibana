/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE } from '../saved_objects';

/**
 * Pattern to match secret references in workflow YAML
 * Format: ${workplace_connector:connector_id:secret_key}
 * or: ${workplace_connector:connector_type:secret_key} (for type-based lookup)
 */
const SECRET_REFERENCE_PATTERN = /\$\{workplace_connector:([^:]+):([^}]+)\}/g;

export interface SecretResolverService {
  resolveSecrets(text: string, savedObjectsClient: SavedObjectsClientContract): Promise<string>;
  resolveSecretsInObject(
    obj: Record<string, any>,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<Record<string, any>>;
}

export class SecretResolver implements SecretResolverService {
  constructor(
    private readonly logger: Logger,
    private readonly eso?: EncryptedSavedObjectsPluginStart
  ) {}

  /**
   * Resolves secret references in a string
   * @param text - Text containing secret references
   * @param savedObjectsClient - SavedObjects client with proper scope
   * @returns Text with secret references replaced by actual values
   */
  async resolveSecrets(
    text: string,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<string> {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const matches = Array.from(text.matchAll(SECRET_REFERENCE_PATTERN));
    if (matches.length === 0) {
      return text;
    }

    let resolvedText = text;

    for (const match of matches) {
      const fullMatch = match[0];
      const connectorIdentifier = match[1]; // Could be ID or type
      const secretKey = match[2];

      try {
        // Try to find connector by ID first
        let connector;
        try {
          connector = await savedObjectsClient.get(
            WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
            connectorIdentifier
          );
        } catch (error) {
          // If not found by ID, try finding by type
          const findResult = await savedObjectsClient.find({
            type: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
            filter: `${WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE}.attributes.type: "${connectorIdentifier}"`,
            perPage: 1,
          });

          if (findResult.total === 0) {
            this.logger.error(
              `No workplace connector found with ID or type: ${connectorIdentifier}`
            );
            continue;
          }

          connector = findResult.saved_objects[0];
        }

        // If ESO client is available, prefer decrypting using internal user; otherwise fallback
        let secrets: Record<string, any> | undefined;
        try {
          if (this.eso) {
            const decrypted = await this.eso
              .getClient({ includedHiddenTypes: [WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE] })
              .getDecryptedAsInternalUser(WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE, connector.id);
            secrets = (decrypted.attributes as unknown as { secrets?: Record<string, any> })
              .secrets;
          } else {
            secrets = (connector.attributes as unknown as { secrets?: Record<string, any> })
              .secrets;
          }
        } catch (decryptErr) {
          this.logger.error(
            `Failed to decrypt secrets for connector ${connector.id}: ${
              (decryptErr as Error).message
            }`
          );
        }
        if (secrets && secrets[secretKey]) {
          const secretValue = secrets[secretKey];
          resolvedText = resolvedText.replace(fullMatch, String(secretValue));
          this.logger.info(`Resolved secret ${secretKey} from connector ${connectorIdentifier}`);
        } else {
          this.logger.warn(`Secret key ${secretKey} not found in connector ${connectorIdentifier}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to resolve secret ${secretKey} from connector ${connectorIdentifier}: ${error.message}`
        );
      }
    }

    return resolvedText;
  }

  /**
   * Resolves secret references in an object (recursively)
   * @param obj - Object that may contain secret references in its values
   * @param savedObjectsClient - SavedObjects client with proper scope
   * @returns Object with secret references resolved
   */
  async resolveSecretsInObject(
    obj: Record<string, any>,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<Record<string, any>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const resolvedObj: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        resolvedObj[key] = await this.resolveSecrets(value, savedObjectsClient);
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          resolvedObj[key] = await Promise.all(
            value.map(async (item) => {
              if (typeof item === 'string') {
                return await this.resolveSecrets(item, savedObjectsClient);
              } else if (typeof item === 'object' && item !== null) {
                return await this.resolveSecretsInObject(item, savedObjectsClient);
              }
              return item;
            })
          );
        } else {
          resolvedObj[key] = await this.resolveSecretsInObject(value, savedObjectsClient);
        }
      } else {
        resolvedObj[key] = value;
      }
    }

    return resolvedObj;
  }
}
