/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
// import { i18n } from '@kbn/i18n';

// import { APP_ID, EXCEPTIONS_FEATURE_ID } from '../constants';
// import { type BaseKibanaFeatureConfig } from '../types';
// import type { SecurityFeatureParams } from '../security/types';

// export const getExceptionsBaseKibanaFeature = (
//   params: SecurityFeatureParams
// ): BaseKibanaFeatureConfig => ({
//   id: EXCEPTIONS_FEATURE_ID,
//   name: i18n.translate(
//     'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionExceptionsTitle',
//     {
//       defaultMessage: 'Exceptions',
//     }
//   ),
//   order: 1100,
//   category: DEFAULT_APP_CATEGORIES.security,
//   app: [EXCEPTIONS_FEATURE_ID, 'kibana'],
//   catalogue: [APP_ID],
//   privileges: {
//     all: {
//       app: [EXCEPTIONS_FEATURE_ID, 'kibana'],
//       catalogue: [APP_ID],
//       savedObject: {
//         all: params.savedObjects,
//         read: params.savedObjects,
//       },
//       ui: ['read', 'crud'],
//       api: ['exceptions_read', 'exceptions_write'],
//     },
//     read: {
//       app: [EXCEPTIONS_FEATURE_ID, 'kibana'],
//       catalogue: [APP_ID],
//       savedObject: {
//         all: [],
//         read: params.savedObjects,
//       },
//       ui: ['read'],
//       api: ['exceptions_read'],
//     },
//   },
// });
