/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { ScopedPaginationSlice } from '../../../flyout_v2/document/pagination/types';
import { getAlertHistoryTitle } from '../../../flyout_v2/document/main/utils/get_header_title';

/**
 * Identity of the alert behind a table row, for the paginated document flyout. The row only
 * holds the columns' fields, so the rule name (and with it the history title) may be missing;
 * the title is then left unset and the flyout opens with the generic one until the document
 * resolves.
 */
export const getDocumentIdentity = (alert: Alert): Partial<ScopedPaginationSlice> => {
  const ruleName = alert[ALERT_RULE_NAME]?.[0] as string | undefined;
  return {
    flyoutDocumentId: alert._id,
    flyoutDocumentIndexName: alert._index,
    ...(ruleName ? { flyoutHistoryTitle: getAlertHistoryTitle(ruleName) } : {}),
  };
};
