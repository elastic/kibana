/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import {
  APP_ID,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_API_ALL,
  EXCEPTIONS_SUBFEATURE_ID,
  EXCEPTIONS_SUBFEATURE_ID_ALL,
  EXCEPTIONS_SUBFEATURE_ID_READ,
  LISTS_API_ALL,
  LISTS_API_READ,
} from '../../constants';
import type { SecurityFeatureParams } from '../security/types';

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
export const getExceptionsSubFeaturesMap = (
  savedObjects: SecurityFeatureParams['savedObjects']
) => {
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
            id: EXCEPTIONS_SUBFEATURE_ID_ALL,
            includeIn: 'all',
            name: TRANSLATIONS.all,
            savedObject: {
              all: savedObjects,
              read: savedObjects,
            },
            ui: ['readExceptions', 'crudExceptions'],
            api: [EXCEPTIONS_API_READ, EXCEPTIONS_API_ALL, LISTS_API_ALL, LISTS_API_READ],
          },
          {
            id: EXCEPTIONS_SUBFEATURE_ID_READ,
            includeIn: 'read',
            name: TRANSLATIONS.read,
            catalogue: [APP_ID],
            savedObject: {
              all: [],
              read: savedObjects,
            },
            ui: ['readExceptions'],
            api: [EXCEPTIONS_API_READ, LISTS_API_READ],
          },
        ],
      },
    ],
  };

  return new Map<typeof EXCEPTIONS_SUBFEATURE_ID, SubFeatureConfig>([
    [EXCEPTIONS_SUBFEATURE_ID, exceptionsSubFeature],
  ]);
};
