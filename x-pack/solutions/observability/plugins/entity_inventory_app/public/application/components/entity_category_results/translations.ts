/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TRUNCATION_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.limitTitle',
  { defaultMessage: 'Entity limit reached' }
);

export const TRUNCATION_BODY = i18n.translate(
  'xpack.entityInventoryApp.entityTable.truncation.limitBody',
  {
    defaultMessage:
      'We can only show a limited number of entities at a time. Use filters to slice and dice further your data. ',
  }
);
