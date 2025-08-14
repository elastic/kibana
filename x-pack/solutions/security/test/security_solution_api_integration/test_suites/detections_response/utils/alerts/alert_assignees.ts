/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertIds } from '@kbn/security-solution-plugin/common/api/model';
import { SetAlertAssigneesRequestBody } from '@kbn/security-solution-plugin/common/api/detection_engine';

export const setAlertAssignees = ({
  assigneesToAdd,
  assigneesToRemove,
  ids,
}: {
  assigneesToAdd: string[];
  assigneesToRemove: string[];
  ids: AlertIds;
}): SetAlertAssigneesRequestBody => ({
  assignees: {
    add: assigneesToAdd,
    remove: assigneesToRemove,
  },
  ids,
});
