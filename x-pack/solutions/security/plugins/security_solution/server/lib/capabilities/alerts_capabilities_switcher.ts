/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
    ALERTS_FEATURE_ID,
    ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE,
    ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
    ALERTS_UI_EDIT,
    ALERTS_UI_READ,
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
    // Since the deprecated privileges do not appear in the latest version of the alerts feature, we need to register it here.
    core.capabilities.registerProvider(() => ({
        [ALERTS_FEATURE_ID]: {
            [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: false,
        },
    }));

    core.capabilities.registerSwitcher(
        async (request, capabilities) => {
            const alertsCapabilities = capabilities[ALERTS_FEATURE_ID] as Record<string, boolean> | undefined;

            if (
                // Users with edit access are already able to update alerts
                alertsCapabilities?.[ALERTS_UI_EDIT] === true || 
                // This user doesn't have read access
                !alertsCapabilities?.[ALERTS_UI_READ]) {
                return {};
            }

            try {
                const security = await getSecurityStart();
                if (!security) {
                    return {};
                }

                const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);

                const deprecatedApiAction = `api:${ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE}`;
                const { hasAllRequested } = await checkPrivileges({
                    kibana: [deprecatedApiAction],
                });

                if (hasAllRequested) {
                    // Inject the deprecated UI capability into the alerts feature
                    return {
                        [ALERTS_FEATURE_ID]: {
                            ...capabilities[ALERTS_FEATURE_ID],
                            [ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE]: true,
                        },
                    };
                }

                return {};
            } catch (error) {
                logger.debug(`Error in alerts capabilities switcher: ${error}`);
                return {};
            }
        },
        {
            capabilityPath: `${ALERTS_FEATURE_ID}.*`,
        }
    );
};