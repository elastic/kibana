/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export {
  ALL_EXCEPTIONS,
  ALL_EXCEPTIONS_SUBTITLE,
  CREATE_BUTTON,
  CREATE_BUTTON_ITEM_BUTTON,
  IMPORT_EXCEPTION_LIST_BUTTON,
} from '../../translations/shared_list';

export const CREATE_MORE_OPTIONS = i18n.translate(
  'xpack.securitySolution.exceptions.appHeader.createMoreOptionsAriaLabel',
  {
    defaultMessage: 'More create options',
  }
);

export const UPDATING = i18n.translate('xpack.securitySolution.exceptions.appHeader.updating', {
  defaultMessage: 'Updating...',
});

export const LAST_UPDATED = (relativeTime: string) =>
  i18n.translate('xpack.securitySolution.exceptions.appHeader.lastUpdated', {
    values: { relativeTime },
    defaultMessage: 'Updated {relativeTime}',
  });
