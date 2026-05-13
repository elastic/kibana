/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  SAVED_VIEW_SO_TYPE,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  THREAT_INTELLIGENCE_FEATURE_ID,
} from '../common';

/**
 * Three-tier privilege model matching the PRD's read / write / admin split:
 *
 *   read  → Kibana feature `read`                       — search / view only
 *   write → Kibana feature `all` minus `manageSources`  — read + manage own
 *                                                          subscriptions
 *   admin → Kibana feature `all`                        — write + manage feed
 *                                                          source catalog
 *
 * The `write` tier is the `all` privilege with the `manageSources` sub-feature
 * privilege withheld; Kibana's role management UI lets admins assign the
 * granular sub-feature breakdown.
 *
 * License: **Platinum** matches the PRD's "Platinum+" baseline. Individual
 * downstream gates still apply at runtime — workflows + Agent Builder skills
 * are Enterprise-only today, so on a Platinum cluster the dashboard, source
 * catalog, search, and subscription routes are usable but the ingestion
 * workflows and the agent skill require Enterprise. This is intentional:
 * we want CISOs on Platinum to be able to *consume* threat intel that an
 * Enterprise neighbour aggregated for them, even before their org upgrades
 * the workflow tier.
 */
export const registerThreatIntelligenceFeature = ({
  features,
}: {
  features: FeaturesPluginSetup;
}): void => {
  features.registerKibanaFeature({
    id: THREAT_INTELLIGENCE_FEATURE_ID,
    name: i18n.translate('xpack.threatIntelligence.feature.name', {
      defaultMessage: 'Threat Intelligence',
    }),
    minimumLicense: 'platinum',
    order: 1100,
    category: DEFAULT_APP_CATEGORIES.security,
    app: [THREAT_INTELLIGENCE_FEATURE_ID],
    catalogue: [],
    privileges: {
      all: {
        app: [THREAT_INTELLIGENCE_FEATURE_ID],
        api: [
          THREAT_INTELLIGENCE_API_PRIVILEGES.read,
          THREAT_INTELLIGENCE_API_PRIVILEGES.writeSubscriptions,
        ],
        catalogue: [],
        savedObject: { all: [SAVED_VIEW_SO_TYPE], read: [SAVED_VIEW_SO_TYPE] },
        ui: ['show', 'createSubscription', 'manageSubscriptions', 'createSavedView'],
      },
      read: {
        app: [THREAT_INTELLIGENCE_FEATURE_ID],
        api: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        catalogue: [],
        savedObject: { all: [], read: [SAVED_VIEW_SO_TYPE] },
        ui: ['show'],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.threatIntelligence.feature.manageSources.name', {
          defaultMessage: 'Manage feed sources',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'manage_sources',
                name: i18n.translate(
                  'xpack.threatIntelligence.feature.manageSources.privilege.name',
                  { defaultMessage: 'All' }
                ),
                includeIn: 'all',
                api: [THREAT_INTELLIGENCE_API_PRIVILEGES.manageSources],
                savedObject: { all: [], read: [] },
                ui: ['manageSources'],
              },
            ],
          },
        ],
      },
    ],
  });
};
