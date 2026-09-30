/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import {
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
} from '../../common/constants';

export type AssertAlertZeroAccess = (
  request: KibanaRequest,
  access: 'read' | 'write'
) => Promise<void>;

interface AlertZeroAccessServices {
  core: Pick<CoreStart, 'savedObjects' | 'uiSettings'>;
  security?: SecurityPluginStart;
}

/** Checks the caller's space setting and AlertZero privilege before tool execution. */
export const createAssertAlertZeroAccess =
  (getServices: () => Promise<AlertZeroAccessServices>): AssertAlertZeroAccess =>
  async (request, access) => {
    const { core, security } = await getServices();
    if (!security) {
      throw new Error('Cannot authorize AlertZero access because security is unavailable.');
    }

    const privilege =
      access === 'read' ? ALERTZERO_API_PRIVILEGE_READ : ALERTZERO_API_PRIVILEGE_WRITE;
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const { hasAllRequested } = await checkPrivileges({
      kibana: [security.authz.actions.api.get(privilege)],
    });
    if (!hasAllRequested) {
      throw new Error(`Missing AlertZero ${access === 'read' ? 'Read' : 'All (write)'} privilege.`);
    }

    const savedObjectsClient = core.savedObjects.getScopedClient(request);
    const uiSettingsClient = core.uiSettings.asScopedToClient(savedObjectsClient);
    if (!(await uiSettingsClient.get<boolean>(ALERTZERO_ENABLED_SETTING_ID))) {
      throw new Error(
        'AlertZero is disabled in this space. Enable the securitySolution:enableAlertZero advanced setting.'
      );
    }
  };
