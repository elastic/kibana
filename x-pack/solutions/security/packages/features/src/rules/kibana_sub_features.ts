/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { APP_ID, EXCEPTIONS_FEATURE_ID } from '../../constants';

const TRANSLATIONS = Object.freeze({
  all: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.allPrivilegeName',
    {
      defaultMessage: 'All',
    }
  ),
  read: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.readPrivilegeName',
    {
      defaultMessage: 'Read',
    }
  ),
});

/**
 * Defines all the Security Solution Cases subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getExceptionsSubFeaturesMapV3 = (savedObjects) => {
  const exceptionsSubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.exceptionsSubFeatureName',
      {
        defaultMessage: 'Exceptions',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'mutually_exclusive',
        privileges: [
          {
            id: `${EXCEPTIONS_FEATURE_ID}_all`,
            includeIn: 'all',
            name: TRANSLATIONS.all,
            savedObject: {
              all: savedObjects,
              read: savedObjects,
            },
            ui: ['read', 'crud'],
            api: ['exceptions_read', 'exceptions_write', 'lists-all', 'lists-read'],
          },
          {
            id: `${EXCEPTIONS_FEATURE_ID}_read`,
            includeIn: 'read',
            name: TRANSLATIONS.read,
            catalogue: [APP_ID],
            savedObject: {
              all: [],
              read: savedObjects,
            },
            ui: ['read'],
            api: ['exceptions_read', 'lists-read'],
          },
        ],
      },
    ],
  };

  return new Map<typeof EXCEPTIONS_FEATURE_ID, SubFeatureConfig>([
    [EXCEPTIONS_FEATURE_ID, exceptionsSubFeature],
  ]);
};
