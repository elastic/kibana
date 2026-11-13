/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  CONFIGURE_SESSIONS_SUB_FEATURE_PRIVILEGE_ID,
  DIGITAL_EXPERIENCE_API_PRIVILEGES,
  DIGITAL_EXPERIENCE_FEATURE_ID,
  DIGITAL_EXPERIENCE_UI_PRIVILEGES,
  MANAGE_SESSIONS_SUB_FEATURE_PRIVILEGE_ID,
} from '../common/feature';
import { SESSIONS_INDEX_PATTERN } from '../common/sessions';
import { SESSIONS_SETTINGS_SO_TYPE } from './saved_objects';

export const registerDigitalExperienceFeature = (features: FeaturesPluginSetup): void => {
  features.registerKibanaFeature({
    id: DIGITAL_EXPERIENCE_FEATURE_ID,
    name: i18n.translate('xpack.digitalExperience.featureRegistry.featureName', {
      defaultMessage: 'Digital experience',
    }),
    privilegesTooltip: i18n.translate('xpack.digitalExperience.featureRegistry.privilegesTooltip', {
      defaultMessage:
        'Digital experience reads its data through APM, so users also need the APM and User Experience feature privilege.',
    }),
    order: 8500,
    category: DEFAULT_APP_CATEGORIES.observability,
    app: [DIGITAL_EXPERIENCE_FEATURE_ID, 'kibana'],
    privileges: {
      all: {
        app: [DIGITAL_EXPERIENCE_FEATURE_ID, 'kibana'],
        api: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read, DIGITAL_EXPERIENCE_API_PRIVILEGES.manage],
        ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.show, DIGITAL_EXPERIENCE_UI_PRIVILEGES.save],
        savedObject: { all: [], read: [] },
      },
      read: {
        app: [DIGITAL_EXPERIENCE_FEATURE_ID, 'kibana'],
        api: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read],
        ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.show],
        savedObject: { all: [], read: [] },
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.digitalExperience.featureRegistry.sessionsSubFeatureName', {
          defaultMessage: 'Sessions',
        }),
        // The summaries task, its settings and index serve every space, so only grant these in all
        // spaces.
        requireAllSpaces: true,
        privilegesTooltip: i18n.translate(
          'xpack.digitalExperience.featureRegistry.sessionsSubFeatureTooltip',
          {
            defaultMessage:
              'Requires "*" (All spaces). Setting session summaries up also needs read on the OTel logs and traces in full, and write on the {sessionsIndex} indices.',
            values: { sessionsIndex: SESSIONS_INDEX_PATTERN },
          }
        ),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: MANAGE_SESSIONS_SUB_FEATURE_PRIVILEGE_ID,
                name: i18n.translate(
                  'xpack.digitalExperience.featureRegistry.manageSessionsPrivilegeName',
                  { defaultMessage: 'Set up session summaries' }
                ),
                // Never granted with `all`: setting sessions up runs the summaries task with this
                // user's data access, for everyone who reads sessions.
                includeIn: 'none',
                api: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions],
                ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.manageSessions],
                savedObject: { all: [], read: [] },
              },
              {
                id: CONFIGURE_SESSIONS_SUB_FEATURE_PRIVILEGE_ID,
                name: i18n.translate(
                  'xpack.digitalExperience.featureRegistry.configureSessionsPrivilegeName',
                  { defaultMessage: 'Configure session summaries' }
                ),
                // Never granted with `all` or with setting sessions up: how often the summaries
                // are built, and how many queries at once, sets their cost for the whole cluster.
                includeIn: 'none',
                api: [DIGITAL_EXPERIENCE_API_PRIVILEGES.configureSessions],
                ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.configureSessions],
                savedObject: { all: [SESSIONS_SETTINGS_SO_TYPE], read: [] },
              },
            ],
          },
        ],
      },
    ],
  });
};
