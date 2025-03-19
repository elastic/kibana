/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEMA_ERRORS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.schema.errorsCallout.title',
  { defaultMessage: 'There was an error during your schema reindex' }
);

export const SCHEMA_ERRORS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.schema.errorsCallout.description',
  {
    defaultMessage:
      'Several documents have field conversion errors. Please view them and then change your field types accordingly.',
  }
);

export const SCHEMA_ERRORS_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.schema.errorsCallout.buttonLabel',
  { defaultMessage: 'View errors' }
);
