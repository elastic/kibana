/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_TIMELINE_ICON = 'timeline';

export const ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.actions.cellValue.addToTimeline.displayName',
  {
    defaultMessage: 'Add to Timeline',
  }
);
export const INVESTIGATE_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.actions.cellValue.addToNewTimeline.displayName',
  {
    defaultMessage: 'Investigate in Timeline',
  }
);

export const SEVERITY = (level: string) =>
  i18n.translate('xpack.securitySolution.actions.addToTimeline.severityLevel', {
    values: { level },
    defaultMessage: `{level} severity`,
  });

export const ALERTS_COUNT = (entity: string, description: string) =>
  description !== ''
    ? i18n.translate('xpack.securitySolution.actions.addToTimeline.descriptiveAlertsCountMessage', {
        values: { description, entity },
        defaultMessage: '{description} alerts from {entity}',
      })
    : i18n.translate('xpack.securitySolution.actions.addToTimeline.alertsCountMessage', {
        values: { entity },
        defaultMessage: '{entity} alerts',
      });

export const ADD_TO_TIMELINE_SUCCESS_TITLE = (value: string) =>
  i18n.translate('xpack.securitySolution.actions.addToTimeline.addedFieldMessage', {
    values: { fieldOrValue: value },
    defaultMessage: `Added {fieldOrValue} to Timeline`,
  });

export const ADD_TO_TIMELINE_FAILED_TITLE = i18n.translate(
  'xpack.securitySolution.actions.cellValue.addToTimeline.warningTitle',
  { defaultMessage: 'Unable to add to Timeline' }
);

export const ADD_TO_TIMELINE_FAILED_TEXT = i18n.translate(
  'xpack.securitySolution.actions.cellValue.addToTimeline.warningMessage',
  { defaultMessage: 'Filter received is empty or cannot be added to Timeline' }
);
