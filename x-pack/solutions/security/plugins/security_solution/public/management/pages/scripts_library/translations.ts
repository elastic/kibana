/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const scriptsLibraryLabels = Object.freeze({
  // page labels
  pageTitle: i18n.translate('xpack.securitySolution.scriptsLibrary.pageTitle', {
    defaultMessage: 'Scripts Library',
  }),
  pageAboutInfo: i18n.translate('xpack.securitySolution.scriptsLibrary.pageAboutInfo', {
    defaultMessage: 'View and manage scripts to upload and execute on Elastic Defend agents.',
  }),
  pageAddButtonTitle: i18n.translate('xpack.securitySolution.scriptsLibrary.pageAddButtonTitle', {
    defaultMessage: 'Add script',
  }),

  // table labels
  table: {
    noItemsMessage: i18n.translate('xpack.securitySolution.scriptsLibrary.table.noItemsMessage', {
      defaultMessage: 'No scripts found',
    }),
    columns: {
      name: i18n.translate('xpack.securitySolution.scriptsLibrary.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      platform: i18n.translate('xpack.securitySolution.scriptsLibrary.table.platformColumnTitle', {
        defaultMessage: 'Platform',
      }),
      tags: i18n.translate('xpack.securitySolution.scriptsLibrary.table.tagsColumnTitle', {
        defaultMessage: 'Tags',
      }),
      updatedBy: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.modifiedByColumnTitle',
        {
          defaultMessage: 'Updated by',
        }
      ),
      updatedAt: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.lastModifiedColumnTitle',
        {
          defaultMessage: 'Last updated',
        }
      ),
      size: i18n.translate('xpack.securitySolution.scriptsLibrary.table.sizeColumnTitle', {
        defaultMessage: 'Size',
      }),
      actions: i18n.translate('xpack.securitySolution.scriptsLibrary.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actionsAriaLabel: i18n.translate('xpack.securitySolution.scriptsLibrary.table.actionmenu', {
        defaultMessage: 'Open',
      }),
    },
    recordsPerPage: (totalScriptCount: number) =>
      i18n.translate('xpack.securitySolution.scriptsLibrary.list.recordRangeLabel', {
        defaultMessage: '{records, plural, one {script} other {scripts}}',
        values: {
          records: totalScriptCount,
        },
      }),
  },
});
