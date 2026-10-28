/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BACK_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.backLabel',
  { defaultMessage: 'Shared Exception Lists' }
);

export const LIST_ID = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.listId',
  { defaultMessage: 'List ID' }
);

export const LINK_RULES = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.linkRules',
  { defaultMessage: 'Link rules' }
);

export const LINKED_RULES = (noOfRules: number) =>
  i18n.translate('xpack.securitySolution.exceptions.listDetailsAppHeader.linkedRules', {
    defaultMessage: 'Linked to {noOfRules, plural, one {# rule} other {# rules}}',
    values: { noOfRules },
  });

export const EDIT_DETAILS = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.editDetails',
  { defaultMessage: 'Edit list details' }
);

export const EXPORT_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.exportList',
  { defaultMessage: 'Export exception list' }
);

export const DUPLICATE_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.duplicateList',
  { defaultMessage: 'Duplicate exception list' }
);

export const DELETE_LIST = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.deleteList',
  { defaultMessage: 'Delete exception list' }
);

export const FALLBACK_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.listDetailsAppHeader.fallbackTitle',
  { defaultMessage: 'Exception list' }
);
