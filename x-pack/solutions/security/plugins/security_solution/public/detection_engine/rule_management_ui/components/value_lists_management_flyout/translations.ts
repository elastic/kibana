/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

export const VALUE_LISTS_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.lists.importValueListTitle',
  {
    defaultMessage: 'Manage value lists',
  }
);

export const FILE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.lists.importValueListDescription',
  {
    defaultMessage: 'Import single value lists to use while writing rule exceptions.',
  }
);

export const FILE_PICKER_PROMPT = i18n.translate(
  'xpack.securitySolution.lists.uploadValueListPrompt',
  {
    defaultMessage: 'Select or drag and drop a file',
  }
);

export const FILE_PICKER_INVALID_FILE_TYPE = (fileTypes: string): string =>
  i18n.translate('xpack.securitySolution.lists.uploadValueListExtensionValidationMessage', {
    values: { fileTypes },
    defaultMessage: 'File must be one of the following types: [{fileTypes}]',
  });

export const CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.closeValueListsModalTitle',
  {
    defaultMessage: 'Close',
  }
);

export const CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.cancelValueListsImportTitle',
  {
    defaultMessage: 'Cancel import',
  }
);

export const UPLOAD_BUTTON = i18n.translate('xpack.securitySolution.lists.valueListImportButton', {
  defaultMessage: 'Import value list',
});

export const UPLOAD_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.lists.valueListsImportSuccessTitle',
  {
    defaultMessage: 'Value list imported',
  }
);

export const UPLOAD_ERROR = i18n.translate('xpack.securitySolution.lists.valueListsUploadError', {
  defaultMessage: 'There was an error uploading the value list.',
});

export const uploadSuccessMessage = (fileName: string) =>
  i18n.translate('xpack.securitySolution.lists.valueListsImportSuccess', {
    defaultMessage: "Value list ''{fileName}'' was imported",
    values: { fileName },
  });

export const EXPORT_ERROR = i18n.translate('xpack.securitySolution.lists.valueListsExportError', {
  defaultMessage: 'There was an error exporting the value list.',
});

export const COLUMN_FILE_NAME = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.fileNameColumn',
  {
    defaultMessage: 'Filename',
  }
);

export const COLUMN_TYPE = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.typeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const COLUMN_UPLOAD_DATE = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.importDateColumn',
  {
    defaultMessage: 'Import Date',
  }
);

export const COLUMN_CREATED_BY = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.createdByColumn',
  {
    defaultMessage: 'Created by',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.actionsColumn',
  {
    defaultMessage: 'Actions',
  }
);

export const ACTION_EXPORT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.exportActionDescription',
  {
    defaultMessage: 'Export value list',
  }
);

export const ACTION_DELETE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.deleteActionDescription',
  {
    defaultMessage: 'Remove value list',
  }
);

export const TABLE_TITLE = i18n.translate('xpack.securitySolution.lists.valueListsTable.title', {
  defaultMessage: 'Value lists',
});

export const LIST_TYPES_RADIO_LABEL = i18n.translate(
  'xpack.securitySolution.lists.valueListsForm.listTypesRadioLabel',
  {
    defaultMessage: 'Elasticsearch field type',
  }
);

/** User-visible label for a value list type (matches Elasticsearch field type names). */
export const getListTypeSelectOptionText = (listType: Type): string => {
  switch (listType) {
    case 'binary':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.binary', {
        defaultMessage: 'binary',
      });
    case 'boolean':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.boolean', {
        defaultMessage: 'boolean',
      });
    case 'byte':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.byte', {
        defaultMessage: 'byte',
      });
    case 'date':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.date', {
        defaultMessage: 'date',
      });
    case 'date_nanos':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.dateNanos', {
        defaultMessage: 'date_nanos',
      });
    case 'date_range':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.dateRange', {
        defaultMessage: 'date_range',
      });
    case 'double':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.double', {
        defaultMessage: 'double',
      });
    case 'double_range':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.doubleRange', {
        defaultMessage: 'double_range',
      });
    case 'float':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.float', {
        defaultMessage: 'float',
      });
    case 'float_range':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.floatRange', {
        defaultMessage: 'float_range',
      });
    case 'geo_point':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.geoPoint', {
        defaultMessage: 'geo_point',
      });
    case 'geo_shape':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.geoShape', {
        defaultMessage: 'geo_shape',
      });
    case 'half_float':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.halfFloat', {
        defaultMessage: 'half_float',
      });
    case 'integer':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.integer', {
        defaultMessage: 'integer',
      });
    case 'integer_range':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.integerRange', {
        defaultMessage: 'integer_range',
      });
    case 'ip':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.ip', {
        defaultMessage: 'ip',
      });
    case 'ip_range':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.ipRange', {
        defaultMessage: 'ip_range',
      });
    case 'keyword':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.keyword', {
        defaultMessage: 'keyword',
      });
    case 'long':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.long', {
        defaultMessage: 'long',
      });
    case 'long_range':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.longRange', {
        defaultMessage: 'long_range',
      });
    case 'shape':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.shape', {
        defaultMessage: 'shape',
      });
    case 'short':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.short', {
        defaultMessage: 'short',
      });
    case 'text':
      return i18n.translate('xpack.securitySolution.lists.valueListsForm.listType.text', {
        defaultMessage: 'text',
      });
  }
};

export const REFERENCE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.lists.referenceModalTitle',
  {
    defaultMessage: 'Remove value list',
  }
);

export const REFERENCE_MODAL_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.referenceModalCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const REFERENCE_MODAL_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.referenceModalDeleteButton',
  {
    defaultMessage: 'Remove value list',
  }
);

export const referenceErrorMessage = (referenceCount: number) =>
  i18n.translate('xpack.securitySolution.lists.referenceModalDescription', {
    defaultMessage:
      'This value list is associated with ({referenceCount}) exception {referenceCount, plural, =1 {list} other {lists}}. Removing this list will remove all exception items that reference this value list.',
    values: { referenceCount },
  });
