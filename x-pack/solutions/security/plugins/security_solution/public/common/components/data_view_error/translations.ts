/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DATA_VIEW_MANDATORY = i18n.translate(
  'xpack.securitySolution.components.dataViewMandatory',
  {
    defaultMessage: 'The DataView is required, but was not provided',
  }
);

export const DATA_VIEW_MANDATORY_MSG = i18n.translate(
  'xpack.securitySolution.components.dataViewMandatoryDetailMessage',
  {
    defaultMessage:
      'The DataView is not selected properly. Please select the appropriate DataView and index patterns',
  }
);
