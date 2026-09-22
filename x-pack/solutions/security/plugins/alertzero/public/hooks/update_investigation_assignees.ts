/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS } from '@kbn/alertzero-common';
import type { UpdateAssigneesResponse } from '@kbn/agentic-investigations-plugin/common';

/** Shown as a danger toast when the assignee update fails, from the queue and the flyout alike. */
export const ASSIGN_ERROR_MESSAGE = i18n.translate('xpack.alertzero.investigations.assignFailed', {
  defaultMessage: 'Unable to update the assignee. Try again.',
});

/**
 * Overwrites the assignee list on an investigation conversation. An empty list clears it.
 *
 * Plain function rather than a hook: the flyout footer is registered from the plugin's
 * `start`, outside any React tree, so it cannot reach the mutation hook.
 */
export const updateInvestigationAssignees = (
  http: HttpStart,
  id: string,
  assignees: string[]
): Promise<UpdateAssigneesResponse> =>
  http.patch<UpdateAssigneesResponse>(
    `/internal/investigations/${encodeURIComponent(id)}/assignees`,
    {
      version: API_VERSIONS.internal.v1,
      body: JSON.stringify({ assignees }),
    }
  );
