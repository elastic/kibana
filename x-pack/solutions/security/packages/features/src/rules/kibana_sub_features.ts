/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { EXCEPTION_LIST_NAMESPACE_AWARE } from '@kbn/securitysolution-list-constants';
import {
  EXCEPTIONS_API_ALL,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_SUBFEATURE_ALL,
  EXCEPTIONS_UI_EDIT,
  EXCEPTIONS_UI_READ,
  LISTS_API_ALL,
  LISTS_API_READ,
} from '../../constants';

const TRANSLATIONS = Object.freeze({
  all: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.subFeatures.manageExceptions',
    {
      defaultMessage: 'Manage Exceptions',
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
      groupType: 'independent',
      privileges: [
        {
          id: EXCEPTIONS_SUBFEATURE_ALL,
          includeIn: 'all',
          name: TRANSLATIONS.all,
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE_AWARE],
            read: [EXCEPTION_LIST_NAMESPACE_AWARE],
          },
          ui: [EXCEPTIONS_UI_READ, EXCEPTIONS_UI_EDIT],
          api: [EXCEPTIONS_API_READ, EXCEPTIONS_API_ALL, LISTS_API_ALL, LISTS_API_READ],
        },
      ],
    },
  ],
});
