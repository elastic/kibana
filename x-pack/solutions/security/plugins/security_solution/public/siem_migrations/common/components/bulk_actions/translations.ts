/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSTALL_SELECTED_ITEMS = (numberOfSelectedItems: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.common.table.installSelectedItems', {
    defaultMessage: 'Install selected ({numberOfSelectedItems})',
    values: { numberOfSelectedItems },
  });
};

export const REPROCESS_FAILED_ITEMS = (numberOfFailedItems: number) => {
  return i18n.translate('xpack.securitySolution.siemMigrations.common.table.reprocessFailedItems', {
    defaultMessage: 'Reprocess failed ({numberOfFailedItems})',
    values: { numberOfFailedItems },
  });
};

export const REPROCESS_FAILED_SELECTED_ITEMS = (numberOfSelectedItems: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.common.table.reprocessFailedSelectedItems',
    {
      defaultMessage: 'Reprocess selected failed ({numberOfSelectedItems})',
      values: { numberOfSelectedItems },
    }
  );
};

export const INSTALL_SELECTED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.table.installSelectedButtonAriaLabel',
  {
    defaultMessage: 'Install selected translated items',
  }
);

export const INSTALL_TRANSLATED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.table.installTranslatedButtonAriaLabel',
  {
    defaultMessage: 'Install all translated items',
  }
);

export const INSTALL_TRANSLATED_ITEMS = (numberOfAllItems: number) => {
  return i18n.translate(
    'xpack.securitySolution.siemMigrations.common.table.installTranslatedItems',
    {
      defaultMessage: 'Install translated ({numberOfAllItems})',
      values: { numberOfAllItems },
    }
  );
};

export const INSTALL_TRANSLATED_ITEMS_EMPTY_STATE = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.table.installTranslatedItemsEmptyState',
  {
    defaultMessage: 'Install translated',
  }
);

export const REPROCESS_FAILED_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.table.reprocessFailedItemsButtonAriaLabel',
  {
    defaultMessage: 'Reprocess failed',
  }
);
