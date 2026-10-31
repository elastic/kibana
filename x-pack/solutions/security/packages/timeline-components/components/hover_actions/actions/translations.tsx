/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_TIMELINE = i18n.translate('securitySolutionPackages.timelineComponents.hoverActions.addToTimeline', {
  defaultMessage: 'Add to Timeline investigation',
});

export const ADDED_TO_TIMELINE_OR_TEMPLATE_MESSAGE = (fieldOrValue: string, isTimeline: boolean) =>
  i18n.translate('securitySolutionPackages.timelineComponents.hoverActions.addToTimeline.addedFieldMessage', {
    values: { fieldOrValue, isTimeline },
    defaultMessage: `Added {fieldOrValue} to {isTimeline, select, true {Timeline} other {template}}`,
  });

export const COPY_TO_CLIPBOARD = i18n.translate(
  'securitySolutionPackages.timelineComponents.dragAndDrop.copyToClipboardTooltip',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const SUCCESS_TOAST_TITLE = (field: string) =>
  i18n.translate('securitySolutionPackages.timelineComponents.clipboard.copy.successToastTitle', {
    values: { field },
    defaultMessage: 'Copied field {field} to the clipboard',
  });
