/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_INDEX_FIELDS_SEARCH = i18n.translate(
  'xpack.securitySolution.indexFieldsSearch.errorSearchDescription',
  {
    defaultMessage: `An error has occurred creating the ad-hoc data view`,
  }
);

export const FETCH_FIELDS_WITH_UNMAPPED_DATA_ERROR = i18n.translate(
  'xpack.securitySolution.dataView.fetchFields.warning',
  {
    defaultMessage: 'Failed to fetch detailed fields information',
  }
);
