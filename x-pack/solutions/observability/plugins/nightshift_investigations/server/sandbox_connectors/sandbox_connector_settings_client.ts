/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID,
  NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
  type NightshiftSandboxConnectorSettingsAttributes,
} from '../saved_objects';

export interface SandboxConnectorSettingsClient {
  getDisabledConnectorIds: (request: KibanaRequest) => Promise<string[]>;
  setConnectorEnabled: (
    request: KibanaRequest,
    params: { connectorId: string; enabled: boolean }
  ) => Promise<string[]>;
}

export interface SandboxConnectorSettingsClientDeps {
  savedObjects?: CoreStart['savedObjects'];
  spaces?: SpacesPluginStart;
}

export const createSandboxConnectorSettingsClient = ({
  getDeps,
}: {
  getDeps: () => SandboxConnectorSettingsClientDeps;
}): SandboxConnectorSettingsClient => {
  const getSpaceId = (request: KibanaRequest): string =>
    getDeps().spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

  const getSavedObjectsClient = (request: KibanaRequest) => {
    const { savedObjects } = getDeps();
    if (!savedObjects) {
      throw new Error('savedObjects is not available — plugin start() has not been called');
    }
    return savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE],
      })
      .asScopedToNamespace(getSpaceId(request));
  };

  const getSettingsObject = async (
    request: KibanaRequest
  ): Promise<SavedObject<NightshiftSandboxConnectorSettingsAttributes> | undefined> => {
    try {
      return await getSavedObjectsClient(request).get<NightshiftSandboxConnectorSettingsAttributes>(
        NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
        NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID
      );
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  };

  return {
    getDisabledConnectorIds: async (request) =>
      (await getSettingsObject(request))?.attributes.disabled_connector_ids ?? [],

    setConnectorEnabled: async (request, { connectorId, enabled }) => {
      const existing = await getSettingsObject(request);
      const current = existing?.attributes.disabled_connector_ids ?? [];
      const next = enabled
        ? current.filter((id) => id !== connectorId)
        : [...new Set([...current, connectorId])];
      if (next.length === current.length && next.every((id, i) => id === current[i])) {
        return current;
      }
      const saved = await getSavedObjectsClient(
        request
      ).create<NightshiftSandboxConnectorSettingsAttributes>(
        NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_TYPE,
        { disabled_connector_ids: next },
        { id: NIGHTSHIFT_SANDBOX_CONNECTOR_SETTINGS_SO_ID, overwrite: true }
      );
      return saved.attributes.disabled_connector_ids;
    },
  };
};
