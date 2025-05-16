/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_LIST_EMPTY_VIEWER_TITLE = i18n.translate(
  'xpack.securitySolution.exception.list.empty.viewer_title',
  {
    defaultMessage: 'Create exceptions to this list',
  }
);

export const EXCEPTION_LIST_EMPTY_VIEWER_BODY = (listName: string) =>
  i18n.translate('xpack.securitySolution.exception.list.empty.viewer_body', {
    values: { listName },
    defaultMessage:
      'There is no exception in your [{listName}]. Create rule exceptions to this list.',
  });

export const EXCEPTION_LIST_EMPTY_VIEWER_BUTTON_ENDPOINT = i18n.translate(
  'xpack.securitySolution.exception.list.empty.viewer_button_endpoint',
  {
    defaultMessage: 'Create endpoint exception',
  }
);

export const EXCEPTION_LIST_EMPTY_VIEWER_BUTTON = i18n.translate(
  'xpack.securitySolution.exception.list.empty.viewer_button',
  {
    defaultMessage: 'Create rule exception',
  }
);

export const EXCEPTION_LIST_EMPTY_SEARCH_BAR_BUTTON_ENDPOINT = i18n.translate(
  'xpack.securitySolution.exception.list.search_bar_button_enpoint',
  {
    defaultMessage: 'Add endpoint exception to list',
  }
);

export const EXCEPTION_LIST_EMPTY_SEARCH_BAR_BUTTON = i18n.translate(
  'xpack.securitySolution.exception.list.search_bar_button',
  {
    defaultMessage: 'Add rule exception to list',
  }
);

export const EXCEPTION_LIST_SEARCH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.list.exceptionItemSearchErrorTitle',
  {
    defaultMessage: 'Error searching',
  }
);

export const EXCEPTION_LIST_SEARCH_ERROR_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.list.exceptionItemSearchErrorBody',
  {
    defaultMessage: 'An error occurred searching for exception items. Please try again.',
  }
);

export const EXCEPTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.list.exceptionItemsFetchError',
  {
    defaultMessage: 'Unable to load exception items',
  }
);

export const EXCEPTION_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.list.exceptionItemsFetchErrorDescription',
  {
    defaultMessage:
      'There was an error loading the exception items. Contact your administrator for help.',
  }
);

export const EXCEPTION_ITEM_DELETE_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.list.exception.item.card.exceptionItemDeleteSuccessTitle',
  {
    defaultMessage: 'Exception deleted',
  }
);

export const EXCEPTION_ITEM_DELETE_TEXT = (itemName: string) =>
  i18n.translate(
    'xpack.securitySolution.exceptions.list.exception.item.card.exceptionItemDeleteSuccessText',
    {
      values: { itemName },
      defaultMessage: '"{itemName}" deleted successfully.',
    }
  );

export const EXCEPTION_LIST_DELETED_SUCCESSFULLY = (listName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.list.deleted_successfully', {
    values: { listName },
    defaultMessage: '{listName} deleted successfully',
  });
export const MANAGE_RULES_CANCEL = i18n.translate(
  'xpack.securitySolution.exceptions.list.manage_rules_cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const MANAGE_RULES_SAVE = i18n.translate(
  'xpack.securitySolution.exceptions.list.manage_rules_save',
  {
    defaultMessage: 'Save',
  }
);
export const LINK_RULES_HEADER = i18n.translate(
  'xpack.securitySolution.exceptions.list.link_rules_header',
  {
    defaultMessage: 'Link rules',
  }
);

export const LINK_RULES_OVERFLOW_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.list.link_rules_overflow_button_title',
  {
    defaultMessage: 'Link rules',
  }
);

export const MANAGE_RULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.list.manage_rules_description',
  {
    defaultMessage: 'Link or unlink rules to this exception list.',
  }
);

export const DELETE_EXCEPTION_LIST = i18n.translate(
  'xpack.securitySolution.exceptionsTable.deleteExceptionList',
  {
    defaultMessage: 'Delete exception list',
  }
);

export const EXPORT_EXCEPTION_LIST = i18n.translate(
  'xpack.securitySolution.exceptionsTable.exportExceptionList',
  {
    defaultMessage: 'Export exception list',
  }
);

export const EXCEPTION_MANAGE_RULES_ERROR = i18n.translate(
  'xpack.securitySolution.exceptionsTable.manageRulesError',
  {
    defaultMessage: 'Manage rules error',
  }
);

export const EXCEPTION_MANAGE_RULES_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptionsTable.manageRulesErrorDescription',
  {
    defaultMessage: 'An error occurred linking or unlinking rules',
  }
);

export const EXCEPTION_EXPORT_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptionsTable.exportListDescription',
  {
    defaultMessage: 'An error occurred exporting a list',
  }
);

export const DUPLICATE_EXCEPTION_LIST = i18n.translate(
  'xpack.securitySolution.exceptionsTable.duplicateExceptionList',
  {
    defaultMessage: 'Duplicate exception list',
  }
);

export const EXCEPTION_DUPLICATE_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptionsTable.duplicateListDescription',
  {
    defaultMessage: 'An error occurred duplicating a list',
  }
);
