/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin/server';
import {
  RULES_API_READ,
  RULES_API_ALL,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_API_ALL,
  ENABLE_DISABLE_RULES_API_PRIVILEGE,
  MANUAL_RUN_RULES_API_PRIVILEGE,
  RULES_MANAGEMENT_SETTINGS_API_PRIVILEGE,
  CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT,
  INVESTIGATION_GUIDE_API_EDIT,
  RULES_UI_READ,
  RULES_UI_EDIT,
  EXCEPTIONS_UI_READ,
  EXCEPTIONS_UI_EDIT,
  ENABLE_DISABLE_RULES_UI,
  MANUAL_RUN_RULES_UI,
  RULES_MANAGEMENT_SETTINGS_UI,
  CUSTOM_HIGHLIGHTED_FIELDS_UI_EDIT,
  INVESTIGATION_GUIDE_UI_EDIT,
} from '@kbn/security-solution-features/constants';
import type { DetectionRulesAuthz } from '../../../../common/detection_engine/rule_management/authz';
import { RULES_FEATURE_ID } from '../../../../common';

interface CalculateRulesAuthzProps {
  coreStart: CoreStart;
  request: KibanaRequest;
  security?: AuthorizationServiceSetup;
}

/**
 * Calculates the detection rules authorization context for the current user.
 *
 * When the Security plugin's authorization service is provided, resolves
 * permissions by checking Kibana API privileges directly. This works reliably
 * for all request types, including Task Manager fake requests authenticated
 * via API keys (where `resolveCapabilities` fails because
 * `request.auth.isAuthenticated` is `false`).
 *
 * Falls back to resolving UI capabilities when the authorization service is
 * not provided.
 *
 * @returns A DetectionRulesAuthz object containing the user's permissions
 */
export const calculateRulesAuthz = async ({
  coreStart,
  request,
  security,
}: CalculateRulesAuthzProps): Promise<DetectionRulesAuthz> => {
  if (security) {
    return calculateRulesAuthzFromApiPrivileges({ request, security });
  }

  return calculateRulesAuthzFromCapabilities({ coreStart, request });
};

const API_PRIVILEGES = [
  RULES_API_READ,
  RULES_API_ALL,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_API_ALL,
  ENABLE_DISABLE_RULES_API_PRIVILEGE,
  MANUAL_RUN_RULES_API_PRIVILEGE,
  CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT,
  INVESTIGATION_GUIDE_API_EDIT,
  RULES_MANAGEMENT_SETTINGS_API_PRIVILEGE,
] as const;

/**
 * Resolves detection rules authorization by checking Kibana API privileges
 * via the Security plugin. Works for both real HTTP requests and Task Manager
 * fake requests with API key authentication.
 */
const calculateRulesAuthzFromApiPrivileges = async ({
  request,
  security,
}: {
  request: KibanaRequest;
  security: AuthorizationServiceSetup;
}): Promise<DetectionRulesAuthz> => {
  const checkPrivileges = security.checkPrivilegesDynamicallyWithRequest(request);

  const { privileges } = await checkPrivileges({
    kibana: API_PRIVILEGES.map((privilege) => security.actions.api.get(privilege)),
  });

  const hasPrivilege = (privilege: string): boolean =>
    privileges.kibana.some(
      (p) => p.privilege === security.actions.api.get(privilege) && p.authorized
    );

  return {
    canReadRules: hasPrivilege(RULES_API_READ),
    canEditRules: hasPrivilege(RULES_API_ALL),
    canReadExceptions: hasPrivilege(EXCEPTIONS_API_READ),
    canEditExceptions: hasPrivilege(EXCEPTIONS_API_ALL),
    canEnableDisableRules: hasPrivilege(ENABLE_DISABLE_RULES_API_PRIVILEGE),
    canManualRunRules: hasPrivilege(MANUAL_RUN_RULES_API_PRIVILEGE),
    canEditCustomHighlightedFields: hasPrivilege(CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT),
    canEditInvestigationGuides: hasPrivilege(INVESTIGATION_GUIDE_API_EDIT),
    canAccessRulesManagementSettings: hasPrivilege(RULES_MANAGEMENT_SETTINGS_API_PRIVILEGE),
  };
};

/**
 * Resolves detection rules authorization from Kibana UI capabilities.
 * Only works for real HTTP requests where `request.auth.isAuthenticated`
 * is `true`.
 */
const calculateRulesAuthzFromCapabilities = async ({
  coreStart,
  request,
}: {
  coreStart: CoreStart;
  request: KibanaRequest;
}): Promise<DetectionRulesAuthz> => {
  const { [RULES_FEATURE_ID]: capabilities } = await coreStart.capabilities.resolveCapabilities(
    request,
    {
      capabilityPath: `${RULES_FEATURE_ID}.*`,
    }
  );

  return {
    canReadRules: capabilities[RULES_UI_READ] as boolean,
    canEditRules: capabilities[RULES_UI_EDIT] as boolean,
    canReadExceptions: capabilities[EXCEPTIONS_UI_READ] as boolean,
    canEditExceptions: capabilities[EXCEPTIONS_UI_EDIT] as boolean,
    canEnableDisableRules: capabilities[ENABLE_DISABLE_RULES_UI] as boolean,
    canManualRunRules: capabilities[MANUAL_RUN_RULES_UI] as boolean,
    canEditCustomHighlightedFields: capabilities[CUSTOM_HIGHLIGHTED_FIELDS_UI_EDIT] as boolean,
    canEditInvestigationGuides: capabilities[INVESTIGATION_GUIDE_UI_EDIT] as boolean,
    canAccessRulesManagementSettings: capabilities[RULES_MANAGEMENT_SETTINGS_UI] as boolean,
  };
};
