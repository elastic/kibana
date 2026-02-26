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
    defaultMessage: 'Upload script',
  }),
  fetchListErrorMessage: (errorMessage: string) =>
    i18n.translate('xpack.securitySolution.scriptsLibrary.fetchListErrorMessage', {
      defaultMessage: 'There was an error fetching the scripts list: {errorMessage}',
      values: {
        errorMessage,
      },
    }),

  // empty state labels
  noPrivilegeEmptyTitle: i18n.translate(
    'xpack.securitySolution.scriptsLibrary.noPrivilegeEmptyTitle',
    { defaultMessage: 'There are no scripts to display.' }
  ),
  emptyStateTitle: i18n.translate('xpack.securitySolution.scriptsLibrary.emptyStateTitle', {
    defaultMessage: 'Add your first script',
  }),
  emptyStateInfo: i18n.translate('xpack.securitySolution.scriptsLibrary.emptyStateInfo', {
    defaultMessage: 'View and manage scripts to upload and execute on Elastic Defend agents.',
  }),
  emptyStatePrimaryButtonLabel: i18n.translate(
    'xpack.securitySolution.scriptsLibrary.emptyStatePrimaryButtonLabel',
    { defaultMessage: 'Upload script' }
  ),

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
        defaultMessage: 'Operating systems',
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

  discardChangesModal: {
    edit: {
      title: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.title',
        {
          defaultMessage: 'Discard script changes?',
        }
      ),
      body: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.bodyText',
        {
          defaultMessage: 'You will lose all unsaved changes made to this script.',
        }
      ),
      discardButtonLabel: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.discardButtonLabel',
        {
          defaultMessage: 'Discard changes',
        }
      ),
      cancelButtonLabel: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.cancelButtonLabel',
        {
          defaultMessage: 'Keep editing',
        }
      ),
    },
    upload: {
      title: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.uploadTitle',
        {
          defaultMessage: 'Discard script upload?',
        }
      ),
      body: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.uploadBodyText',
        {
          defaultMessage:
            'You will lose all information entered and the selected file will not be uploaded.',
        }
      ),
      discardButtonLabel: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.uploadDiscardButtonLabel',
        {
          defaultMessage: 'Discard upload',
        }
      ),
      cancelButtonLabel: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.discardChangesModal.uploadCancelButtonLabel',
        {
          defaultMessage: 'Keep uploading',
        }
      ),
    },
  },

  flyout: {
    editHeader: i18n.translate('xpack.securitySolution.scriptsLibrary.table.flyout.headerTitle', {
      defaultMessage: 'Edit script',
    }),
    createHeader: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.flyout.createHeaderTitle',
      {
        defaultMessage: 'Upload script',
      }
    ),
    flyoutViewItemFetchError: (errorMessage: string) =>
      i18n.translate('xpack.securitySolution.scriptsLibrary.table.flyout.view.loadFailureMessage', {
        defaultMessage: 'Could not load script details. {errorMessage}',
        values: { errorMessage },
      }),
    flyoutEditItemFetchError: (errorMessage: string) =>
      i18n.translate('xpack.securitySolution.scriptsLibrary.table.flyout.edit.loadFailureMessage', {
        defaultMessage: 'Could not load script for editing. {errorMessage}',
        values: { errorMessage },
      }),
    flyoutEditSubmitSuccess: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.flyout.edit.submitSuccessMessage',
      {
        defaultMessage: 'Script saved successfully',
      }
    ),
    flyoutCreateSubmitSuccess: i18n.translate(
      'xpack.securitySolution.scriptsLibrary.table.flyout.create.submitSuccessMessage',
      {
        defaultMessage: 'Script uploaded successfully',
      }
    ),
    body: {
      edit: {
        filePickerPrompt: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.filePickerLabel',
            {
              defaultMessage: 'Select or drag and drop a file',
            }
          ),
          validationErrorMessage: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.filePickerPrompt.validationErrorMessage',
            {
              defaultMessage: 'A script file is required.',
            }
          ),
        },
        removeFileButtonLabel: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.removeFileButtonLabel',
          {
            defaultMessage: 'Remove',
          }
        ),
        name: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.nameLabel',
            {
              defaultMessage: 'Name',
            }
          ),
          validationErrorMessage: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.name.validationErrorMessage',
            {
              defaultMessage: 'Name is required.',
            }
          ),
        },
        platforms: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.platformsLabel',
            {
              defaultMessage: 'Operating systems',
            }
          ),
          validationErrorMessage: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.platforms.validationErrorMessage',
            {
              defaultMessage: 'At least one operating system must be selected.',
            }
          ),
        },
        requiresInput: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.requiresInputLabel',
            {
              defaultMessage: 'This script requires user input.',
            }
          ),
          tooltip: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.requiresInputTooltip',
            {
              defaultMessage:
                'Check this box if your script prompts for or requires additional input when executed.',
            }
          ),
        },
        pathToExecutable: {
          label: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.pathToExecutableLabel',
            {
              defaultMessage: 'Path to executable file (only for archive files)',
            }
          ),
          tooltip: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.pathToExecutableTooltip',
            {
              defaultMessage:
                'Enter the relative path to the main script inside the archive (zip/rar). Example: ./src/main.py',
            }
          ),
          helpText: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.pathToExecutable.helpText',
            {
              defaultMessage:
                'Specify the path to the main script within the archive file for proper execution.',
            }
          ),
        },
        optionalFieldLabel: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.optionalFieldLabel',
          {
            defaultMessage: 'optional',
          }
        ),
        description: {
          helpText: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.description.helpText',
            {
              defaultMessage: "Provide a brief description of the script's functionality.",
            }
          ),
        },
        instructions: {
          helpText: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.instructions.helpText',
            {
              defaultMessage:
                'Provide step-by-step instructions on how to use or execute the script.',
            }
          ),
        },
        example: {
          helpText: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.edit.example.helpText',
            {
              defaultMessage: 'Provide examples of how to use the script.',
            }
          ),
        },
      },

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
              defaultMessage: 'Path to executable file (only for archive files)',
            }
          ),
          tooltip: i18n.translate(
            'xpack.securitySolution.scriptsLibrary.table.flyout.body.pathToExecutableTooltip',
            {
              defaultMessage:
                'The relative path to the main script inside the archive (zip/rar). Example: ./src/main.py',
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
    footer: {
      cancelButtonLabel: i18n.translate(
        'xpack.securitySolution.scriptsLibrary.table.flyout.footer.edit.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      ),
      edit: {
        saveButtonLabel: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.footer.edit.saveButtonLabel',
          {
            defaultMessage: 'Save',
          }
        ),
        saveSuccessToastTitle: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.footer.edit.saveSuccessToastTitle',
          {
            defaultMessage: 'Script updated successfully',
          }
        ),
        saveErrorToastTitle: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.footer.edit.saveErrorToastTitle',
          {
            defaultMessage: 'Failed to update script',
          }
        ),
      },
      upload: {
        uploadButtonLabel: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.footer.upload.uploadButtonLabel',
          {
            defaultMessage: 'Upload',
          }
        ),
        uploadSuccessToastTitle: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.footer.upload.uploadSuccessToastTitle',
          {
            defaultMessage: 'Script uploaded successfully',
          }
        ),
        uploadErrorToastTitle: i18n.translate(
          'xpack.securitySolution.scriptsLibrary.table.flyout.footer.upload.uploadErrorToastTitle',
          {
            defaultMessage: 'Failed to upload script',
          }
        ),
      },
    },
  },
});
