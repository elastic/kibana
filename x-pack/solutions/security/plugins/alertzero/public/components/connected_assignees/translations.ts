/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONNECTED_ASSIGNEES_LABELS = Object.freeze({
  assignSuccess: i18n.translate('xpack.alertzero.connectedAssignees.assignSuccess', {
    defaultMessage: 'Assignees updated',
  }),
  assignError: i18n.translate('xpack.alertzero.connectedAssignees.assignError', {
    defaultMessage: 'Failed to update assignees',
  }),
});
