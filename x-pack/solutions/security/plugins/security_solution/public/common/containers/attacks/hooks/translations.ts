/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_ATTACKS_FAILURE = i18n.translate(
  'xpack.securitySolution.attacks.searchAttacksFailure',
  {
    defaultMessage: 'Failed to search attacks',
  }
);

export const SET_ATTACKS_STATUS_SUCCESS_TOAST = (totalAttacks: number) =>
  i18n.translate('xpack.securitySolution.attacks.setStatusSuccessToastMessage', {
    values: { totalAttacks },
    defaultMessage:
      'Successfully updated workflow status for {totalAttacks} {totalAttacks, plural, =1 {attack} other {attacks}}.',
  });

export const SET_ATTACKS_STATUS_FAILURE = i18n.translate(
  'xpack.securitySolution.attacks.setStatusFailure',
  {
    defaultMessage: 'Failed to update attack workflow status',
  }
);

export const SET_ATTACKS_TAGS_SUCCESS_TOAST = (totalAttacks: number) =>
  i18n.translate('xpack.securitySolution.attacks.setTagsSuccessToastMessage', {
    values: { totalAttacks },
    defaultMessage:
      'Successfully updated tags for {totalAttacks} {totalAttacks, plural, =1 {attack} other {attacks}}.',
  });

export const SET_ATTACKS_TAGS_FAILURE = i18n.translate(
  'xpack.securitySolution.attacks.setTagsFailure',
  {
    defaultMessage: 'Failed to update attack tags',
  }
);

export const SET_ATTACKS_ASSIGNEES_SUCCESS_TOAST = (totalAttacks: number) =>
  i18n.translate('xpack.securitySolution.attacks.setAssigneesSuccessToastMessage', {
    values: { totalAttacks },
    defaultMessage:
      'Successfully updated assignees for {totalAttacks} {totalAttacks, plural, =1 {attack} other {attacks}}.',
  });

export const SET_ATTACKS_ASSIGNEES_FAILURE = i18n.translate(
  'xpack.securitySolution.attacks.setAssigneesFailure',
  {
    defaultMessage: 'Failed to update attack assignees',
  }
);
