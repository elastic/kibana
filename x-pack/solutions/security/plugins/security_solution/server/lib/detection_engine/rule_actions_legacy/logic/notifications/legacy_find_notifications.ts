/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams, FindResult } from '@kbn/alerting-plugin/server';
import { LEGACY_NOTIFICATIONS_ID } from '../../../../../../common/constants';
// eslint-disable-next-line no-restricted-imports
import type { LegacyFindNotificationParams } from './legacy_types';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetFilter = (filter: string | null | undefined) => {
  if (filter == null) {
    return `alert.attributes.alertTypeId: ${LEGACY_NOTIFICATIONS_ID}`;
  } else {
    return `alert.attributes.alertTypeId: ${LEGACY_NOTIFICATIONS_ID} AND ${filter}`;
  }
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyFindNotifications = async ({
  rulesClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
}: LegacyFindNotificationParams): Promise<FindResult<RuleTypeParams>> =>
  rulesClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: legacyGetFilter(filter),
      sortOrder,
      sortField,
    },
  });
