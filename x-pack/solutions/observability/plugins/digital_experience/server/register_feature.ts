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
  CREATE_SHORT_URL_SUB_FEATURE_PRIVILEGE_ID,
  DIGITAL_EXPERIENCE_API_PRIVILEGES,
  DIGITAL_EXPERIENCE_FEATURE_ID,
  DIGITAL_EXPERIENCE_UI_PRIVILEGES,
  MANAGE_SESSIONS_SUB_FEATURE_PRIVILEGE_ID,
} from '../common/feature';
import { SAVED_VIEW_TYPE } from '../common/saved_views';

/** The saved object type of the share plugin's short URLs. */
const SHORT_URL_TYPE = 'url';

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
        // Saving, updating and deleting the views of the space.
        savedObject: { all: [SAVED_VIEW_TYPE], read: [SAVED_VIEW_TYPE] },
      },
      read: {
        app: [DIGITAL_EXPERIENCE_FEATURE_ID, 'kibana'],
        api: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read],
        ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.show],
        // Applying the views of the space, not changing them.
        savedObject: { all: [], read: [SAVED_VIEW_TYPE] },
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.digitalExperience.featureRegistry.sessionsSubFeatureName', {
          defaultMessage: 'Sessions',
        }),
        // The sessions transforms and index serve every space, so only grant this in all spaces.
        requireAllSpaces: true,
        privilegesTooltip: i18n.translate(
          'xpack.digitalExperience.featureRegistry.sessionsSubFeatureTooltip',
          {
            defaultMessage:
              'Requires "*" (All spaces). Users also need the Elasticsearch privileges to manage transforms, ingest pipelines and index templates.',
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
                  { defaultMessage: 'Set up and update session summaries' }
                ),
                // Never granted with `all`: setting sessions up runs the transforms with this
                // user's data access, for everyone who reads sessions.
                includeIn: 'none',
                api: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions],
                ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.manageSessions],
                savedObject: { all: [], read: [] },
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.digitalExperience.featureRegistry.shortUrlsSubFeatureName', {
          defaultMessage: 'Short URLs',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: CREATE_SHORT_URL_SUB_FEATURE_PRIVILEGE_ID,
                name: i18n.translate(
                  'xpack.digitalExperience.featureRegistry.createShortUrlPrivilegeName',
                  { defaultMessage: 'Create short URLs' }
                ),
                // Part of `all`, as in Discover and Dashboard, and taken off in a custom role.
                // Short URLs are saved objects of the space that other apps' links share.
                includeIn: 'all',
                ui: [DIGITAL_EXPERIENCE_UI_PRIVILEGES.createShortUrl],
                savedObject: { all: [SHORT_URL_TYPE], read: [] },
              },
            ],
          },
        ],
      },
    ],
  });
};
