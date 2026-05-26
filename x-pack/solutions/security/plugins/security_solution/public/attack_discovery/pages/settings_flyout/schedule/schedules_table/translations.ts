/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_DISCOVER_SCHEDULES_TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.caption',
  {
    defaultMessage: 'Scheduled Attack Discoveries',
  }
);

export const ATTACK_DISCOVER_SCHEDULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.description',
  {
    defaultMessage:
      'Scheduled Attack Discoveries will generate automatically, based on their settings.',
  }
);

export const BULK_ACTIONS_SELECTED_COUNT = (selectedCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkActionsSelectedCount',
    {
      defaultMessage: 'Selected {selectedCount, plural, one {# schedule} other {# schedules}}',
      values: { selectedCount },
    }
  );

export const BULK_ACTIONS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkActions',
  {
    defaultMessage: 'Bulk actions',
  }
);

export const REFRESH = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.refresh',
  {
    defaultMessage: 'Refresh',
  }
);

export const BULK_ENABLE_ACTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkEnableAction',
  {
    defaultMessage: 'Enable',
  }
);

export const BULK_DISABLE_ACTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkDisableAction',
  {
    defaultMessage: 'Disable',
  }
);

export const BULK_DELETE_ACTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkDeleteAction',
  {
    defaultMessage: 'Delete',
  }
);

export const BULK_DELETE_CONFIRMATION_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkDeleteConfirmationTitle',
  {
    defaultMessage: 'Delete schedules?',
  }
);

export const BULK_DELETE_CONFIRMATION_BODY = (selectedCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkDeleteConfirmationBody',
    {
      defaultMessage:
        'This action will delete {selectedCount, plural, one {the selected schedule} other {# selected schedules}}.',
      values: { selectedCount },
    }
  );

export const BULK_DELETE_CONFIRMATION_CANCEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkDeleteConfirmationCancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const BULK_DELETE_CONFIRMATION_CONFIRM = i18n.translate(
  'xpack.securitySolution.attackDiscovery.settingsFlyout.schedule.table.bulkDeleteConfirmationConfirm',
  {
    defaultMessage: 'Delete',
  }
);
