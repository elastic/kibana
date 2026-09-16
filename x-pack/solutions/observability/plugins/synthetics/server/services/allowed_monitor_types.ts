/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { SyntheticsServerSetup } from '../types';
import { DefaultSyntheticsMultiSpaceSettingsRepository } from './synthetics_multi_space_settings_repository';

// The monitor-type allow-list lives on the shared `synthetics-settings-multi-space` SO.
// Use a space-aware client with the security extension excluded so monitor writers can read
// the policy during creation without needing saved-object privileges on that type, and so the
// dedicated (already privilege-gated) policy route can share the SO across spaces.
export const buildMultiSpaceSettingsRepository = (
  server: SyntheticsServerSetup,
  request: KibanaRequest
) => {
  const soClient = server.coreStart.savedObjects.getScopedClient(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
  });
  return new DefaultSyntheticsMultiSpaceSettingsRepository(soClient);
};

// Per-space allow-list of creatable monitor types. `undefined`/empty means no restriction.
export const getAllowedMonitorTypes = async (
  server: SyntheticsServerSetup,
  request: KibanaRequest
): Promise<string[] | undefined> => {
  const settings = await buildMultiSpaceSettingsRepository(server, request).get();
  return settings.allowedMonitorTypes;
};
