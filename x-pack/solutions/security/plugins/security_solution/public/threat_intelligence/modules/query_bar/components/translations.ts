/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_FOR_TITLE = i18n.translate(
  'xpack.securitySolution.threatIntelligence.queryBar.filterFor',
  {
    defaultMessage: 'Filter for',
  }
);

export const FILTER_OUT_TITLE = i18n.translate(
  'xpack.securitySolution.threatIntelligence.queryBar.filterOut',
  {
    defaultMessage: 'Filter out',
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

export const ADD_TO_TIMELINE_ANNOUNCEMENT = (value: string) =>
  i18n.translate('xpack.securitySolution.threatIntelligence.queryBar.addToTimelineAnnouncement', {
    defaultMessage: 'Added {value} to timeline',
    values: { value },
  });
