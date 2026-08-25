/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEDULE_DETAILS_TITLE = (scheduleName: string) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.title', {
    defaultMessage: '{scheduleName}',
    values: { scheduleName },
  });

export const SCHEDULE_UPDATE_TITLE = (scheduleName: string) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.updateScheduleTitle',
    {
      defaultMessage: 'Edit {scheduleName}',
      values: { scheduleName },
    }
  );

export const CREATED_BY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.createdByDescription',
  {
    defaultMessage: 'Created by',
  }
);

export const UPDATED_BY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.updatedByDescription',
  {
    defaultMessage: 'Updated by',
  }
);

export const STATUS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.statusDescription',
  {
    defaultMessage: 'Last run',
  }
);

export const STATUS_AT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.statusAtDescription',
  {
    defaultMessage: 'at',
  }
);

export const STATUS_DATE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.statusDateDescription',
  {
    defaultMessage: 'Status date',
  }
);

export const UNKNOWN_TEXT = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.unknownText',
  {
    defaultMessage: 'Unknown',
  }
);
