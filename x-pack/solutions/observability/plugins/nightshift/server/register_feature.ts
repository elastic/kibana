/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_FEATURE_ID,
  NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID,
  NIGHTSHIFT_SOURCE_SO_TYPE,
  NIGHTSHIFT_UI_PRIVILEGES,
} from '@kbn/nightshift-shared';

// Nightshift investigations live in the shared `agenticInvestigations` and `proposals` plugins,
// whose routes require these API privileges. Cross-plugin server imports are forbidden, so the
// values are spelled out; the test pins them to the owners' strings.
const AGENTIC_INVESTIGATIONS_API_PRIVILEGE_MANAGE = 'manage_investigations';
const PROPOSALS_API_PRIVILEGE_READ = 'read_proposals';
const PROPOSALS_API_PRIVILEGE_MANAGE = 'manage_proposals';

export function registerNightshiftFeature(features: FeaturesPluginSetup): void {
  features.registerKibanaFeature({
    id: NIGHTSHIFT_FEATURE_ID,
    name: i18n.translate('xpack.nightshift.featureRegistry.featureName', {
      defaultMessage: 'Nightshift',
    }),
    order: 8700,
    category: DEFAULT_APP_CATEGORIES.observability,
    minimumLicense: 'enterprise',
    app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
    privileges: {
      all: {
        app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
        api: [
          NIGHTSHIFT_API_PRIVILEGES.read,
          NIGHTSHIFT_API_PRIVILEGES.manage,
          AGENTIC_INVESTIGATIONS_API_PRIVILEGE_MANAGE,
          PROPOSALS_API_PRIVILEGE_READ,
          PROPOSALS_API_PRIVILEGE_MANAGE,
        ],
        ui: [NIGHTSHIFT_UI_PRIVILEGES.show, NIGHTSHIFT_UI_PRIVILEGES.manage],
        alerts: { read: true },
        aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
        savedObject: { all: [NIGHTSHIFT_SOURCE_SO_TYPE], read: [] },
      },
      read: {
        app: [NIGHTSHIFT_APP_ID, SIGNIFICANT_EVENTS_APP_ID],
        // `agenticInvestigations` has no read-only investigations privilege yet, so read-only
        // Nightshift users cannot use its investigation routes.
        // TODO(ns-1619 s3): grant the read investigations API privilege added by the query API.
        api: [NIGHTSHIFT_API_PRIVILEGES.read, PROPOSALS_API_PRIVILEGE_READ],
        ui: [NIGHTSHIFT_UI_PRIVILEGES.show],
        alerts: { read: true },
        aiIndex: { read: [SIGNIFICANT_EVENT_KI_TYPE] },
        savedObject: { all: [], read: [NIGHTSHIFT_SOURCE_SO_TYPE] },
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.nightshift.featureRegistry.configureSubFeatureName', {
          defaultMessage: 'Manage engines',
        }),
        description: i18n.translate(
          'xpack.nightshift.featureRegistry.configureSubFeatureDescription',
          {
            defaultMessage: 'Pause activity, edit settings, and manage limits.',
          }
        ),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID,
                name: i18n.translate('xpack.nightshift.featureRegistry.configurePrivilegeName', {
                  defaultMessage: 'Manage engines',
                }),
                includeIn: 'none',
                api: [NIGHTSHIFT_API_PRIVILEGES.configure],
                ui: [NIGHTSHIFT_UI_PRIVILEGES.configure],
                savedObject: { all: [], read: [] },
              },
            ],
          },
        ],
      },
    ],
  });
}
