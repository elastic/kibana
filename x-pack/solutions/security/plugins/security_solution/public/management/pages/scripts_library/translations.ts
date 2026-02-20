/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCRIPT_LIBRARY_LABELS = Object.freeze({
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
  fetchListErrorMessage: (errorMessage: string) =>
    i18n.translate('xpack.securitySolution.scriptsLibrary.fetchListErrorMessage', {
      defaultMessage: 'There was an error fetching the scripts list: {errorMessage}',
      values: {
        errorMessage,
      },
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
        defaultMessage: 'Platforms',
      }),
      tags: i18n.translate('xpack.securitySolution.scriptsLibrary.table.tagsColumnTitle', {
        defaultMessage: 'Types',
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
    title: i18n.translate('xpack.securitySolution.scriptsLibrary.deleteModal.actions.deleteLabel', {
      defaultMessage: 'Delete script?',
    }),
    deleteButtonLabel: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.deleteModal.actions.deleteConfirmButtonLabel',
      {
        defaultMessage: 'Delete',
      }
    ),
    cancelButtonLabel: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.deleteModal.actions.deleteCancelButtonLabel',
      {
        defaultMessage: 'Cancel',
      }
    ),
    successToastTitle: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.deleteModal.actions.deleteSuccessTitle',
      {
        defaultMessage: 'Script deleted successfully',
      }
    ),
    errorToastTitle: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.deleteModal.actions.deleteErrorTitle',
      {
        defaultMessage: 'Failed to delete script',
      }
    ),
  },
  flyout: {
    flyoutViewItemFetchError: (errorMessage: string) =>
      i18n.translate('xpack.securitySolution.scriptsLibrary.table.flyout.view.loadFailureMessage', {
        defaultMessage: 'Could not load script details. {errorMessage}',
        values: { errorMessage },
      }),
    body: {
      details: {
        requiresInput: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.requiresInputLabel',
            {
              defaultMessage: 'Requires user input',
            }
          ),
          tooltip: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.requiresInputTooltip',
            {
              defaultMessage: 'Indicates if the script requires input parameters to run.',
            }
          ),
        },
        tags: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.tagsLabel',
            {
              defaultMessage: 'Types',
            }
          ),
        },
        description: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.descriptionLabel',
            {
              defaultMessage: 'Description',
            }
          ),
        },
        instructions: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.instructionsLabel',
            {
              defaultMessage: 'Instructions',
            }
          ),
        },
        example: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.examplesLabel',
            {
              defaultMessage: 'Examples',
            }
          ),
        },
        fileName: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.fileNameLabel',
            {
              defaultMessage: 'File name',
            }
          ),
        },
        pathToExecutable: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.pathToExecutableLabel',
            {
              defaultMessage: 'Path to executable file',
            }
          ),
        },
        fileSize: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.fileSizeLabel',
            {
              defaultMessage: 'File size',
            }
          ),
        },
        fileHash: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.fileHashLabel',
            {
              defaultMessage: 'SHA256',
            }
          ),
        },
        updatedBy: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.updatedByLabel',
            {
              defaultMessage: 'Updated by',
            }
          ),
        },
      },
    },
  },
});
