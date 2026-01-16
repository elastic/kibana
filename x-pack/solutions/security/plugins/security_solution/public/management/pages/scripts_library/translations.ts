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
    actions: {
      details: i18n.translate('xpack.securitySolution.scriptsLibrary.table.actions.detailsLabel', {
        defaultMessage: 'View details',
      }),
      edit: i18n.translate('xpack.securitySolution.scriptsLibrary.table.actions.editLabel', {
        defaultMessage: 'Edit script',
      }),
      delete: i18n.translate('xpack.securitySolution.scriptsLibrary.table.actions.deleteLabel', {
        defaultMessage: 'Delete script',
      }),
      download: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.actions.downloadLabel',
        { defaultMessage: 'Download script' }
      ),
    },
    recordsPerPage: (totalScriptCount: number) =>
      i18n.translate('xpack.securitySolution.scriptsLibrary.list.recordRangeLabel', {
        defaultMessage: '{records, plural, one {script} other {scripts}}',
        values: {
          records: totalScriptCount,
        },
      }),
  },
  deleteModal: {
    title: (scriptName: string) =>
      i18n.translate('xpack.securitySolution.scriptsLibrary.table.actions.deleteLabel', {
        defaultMessage: 'Delete "{scriptName}"?',
        values: { scriptName },
      }),
    confirmationText: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.actions.deleteConfirmationText',
      {
        defaultMessage:
          'This action cannot be undone. The script and all its metadata will be permanently removed from the library.',
      }
    ),
    deleteButtonLabel: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.actions.deleteConfirmButtonLabel',
      {
        defaultMessage: 'Delete',
      }
    ),
    cancelButtonLabel: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.actions.deleteCancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    ),
    successToastTitle: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.actions.deleteSuccessTitle',
      {
        defaultMessage: 'Script deleted successfully',
      }
    ),
    errorToastTitle: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.actions.deleteErrorTitle',
      {
        defaultMessage: 'Failed to delete script',
      }
    ),
  },
});
