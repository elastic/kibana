/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { decodeObservabilityAlert } from '../../../common/cases/attachments/alert';

export const observabilityAlertAttachmentType = {
  id: OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  schemaValidator: (metadata: unknown) => {
    decodeObservabilityAlert(metadata);
  },
};
