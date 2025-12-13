/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { EXCEPTION_LIST_NAMESPACE } from '@kbn/securitysolution-list-constants';
import {
  APP_ID,
  EXCEPTIONS_API_ALL,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_SUBFEATURE_ID_ALL,
  EXCEPTIONS_SUBFEATURE_ID_READ,
  EXCEPTIONS_UI_CRUD,
  EXCEPTIONS_UI_READ,
  LISTS_API_ALL,
  LISTS_API_READ,
} from '../../constants';

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

export const getExceptionsSubFeature = (): SubFeatureConfig => ({
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
            all: [EXCEPTION_LIST_NAMESPACE],
            read: [EXCEPTION_LIST_NAMESPACE],
          },
          ui: [EXCEPTIONS_UI_READ, EXCEPTIONS_UI_CRUD],
          api: [EXCEPTIONS_API_READ, EXCEPTIONS_API_ALL, LISTS_API_ALL, LISTS_API_READ],
        },
        {
          id: EXCEPTIONS_SUBFEATURE_ID_READ,
          includeIn: 'read',
          name: TRANSLATIONS.read,
          catalogue: [APP_ID],
          savedObject: {
            all: [],
            read: [EXCEPTION_LIST_NAMESPACE],
          },
          ui: [EXCEPTIONS_UI_READ],
          api: [EXCEPTIONS_API_READ, LISTS_API_READ],
        },
      ],
    },
  ],
});
