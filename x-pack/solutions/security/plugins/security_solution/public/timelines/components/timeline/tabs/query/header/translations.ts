/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CALL_OUT_UNAUTHORIZED_MSG = i18n.translate(
  'xpack.securitySolution.timeline.callOut.unauthorized.message.description',
  {
    defaultMessage:
      'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.',
  }
);

export const CALL_OUT_IMMUTABLE = i18n.translate(
  'xpack.securitySolution.timeline.callOut.immutable.message.description',
  {
    defaultMessage:
      'This prebuilt timeline template cannot be modified. To make changes, please duplicate this template and make modifications to the duplicate template.',
  }
);
