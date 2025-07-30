/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BACK_BUTTON = i18n.translate(
  'securitySolutionPackages.expandableFlyout.previewSection.backButton',
  {
    defaultMessage: 'Back',
  }
);

export const CLOSE_BUTTON = i18n.translate(
  'securitySolutionPackages.expandableFlyout.previewSection.closeButton',
  {
    defaultMessage: 'Close',
  }
);

export const FILTER_OUT_ANNOUNCEMENT = (field: string, value: string) =>
  i18n.translate('xpack.securitySolution.threatIntelligence.queryBar.filterOutAnnouncement', {
    defaultMessage: 'Filter applied excluding entries where {field} is {value}. Chart updated',
    values: { field, value },
  });

export const FILTER_IN_ANNOUNCEMENT = (field: string, value: string) =>
  i18n.translate('xpack.securitySolution.threatIntelligence.queryBar.filterInAnnouncement', {
    defaultMessage: 'Filter applied showing only entries where {field} is {value}. Chart updated',
    values: { field, value },
  });
