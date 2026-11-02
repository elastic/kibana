/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE,
  SECURITY_FEATURE_ID_V1,
  SECURITY_FEATURE_ID_V2,
  SECURITY_FEATURE_ID_V3,
  SECURITY_FEATURE_ID_V4,
  RULES_FEATURE_ID_V1,
  RULES_FEATURE_ID_V2,
} from '@kbn/security-solution-features/constants';

interface SetupDeps {
  core: CoreSetup;
  logger: Logger;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}

/**
 * Registers a capability switcher that grants the deprecated alerts update capability
 * to users who have read access on deprecated features (siem, siemV2, siemV3, siemV4, securityRulesV1 and securityRulesV2).
 *
 * This maintains backward compatibility: users with deprecated feature privileges can still
 * trigger alert updates from the UI, while users with only the new alerts feature 'read' privilege cannot.
 */
export const setupAlertsCapabilitiesSwitcher = ({ core, logger, getSecurityStart }: SetupDeps) => {
  // Since deprecated UI privileges do not appear in the latest version of the alerts feature, we need to register them here.
  const deprecatedFeatures = [
    SECURITY_FEATURE_ID_V1,
    SECURITY_FEATURE_ID_V2,
    SECURITY_FEATURE_ID_V3,
    SECURITY_FEATURE_ID_V4,
    RULES_FEATURE_ID_V1,
    RULES_FEATURE_ID_V2,
  ];

  core.capabilities.registerProvider(() =>
    deprecatedFeatures.reduce((acc, featureId) => {
      acc[featureId] = {
        // Even though we set it to true here, the privilege is only granted
        // if it is explicitly listed in the ui privileges in the feature configuration
        [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
      };
      return acc;
    }, {} as Record<string, { [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: boolean }>)
  );
};
