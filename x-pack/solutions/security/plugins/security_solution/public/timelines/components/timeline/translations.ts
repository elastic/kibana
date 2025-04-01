/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type TimelineType, TimelineTypeEnum } from '../../../../common/api/timeline';

export const DEFAULT_TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.defaultTimelineTitle',
  {
    defaultMessage: 'None',
  }
);

export const DEFAULT_TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.defaultTimelineDescription',
  {
    defaultMessage: 'Timeline offered by default when creating new timeline.',
  }
);

export const EVENTS_TABLE_ARIA_LABEL = ({
  activePage,
  totalPages,
}: {
  activePage: number;
  totalPages: number;
}) =>
  i18n.translate('xpack.securitySolution.timeline.eventsTableAriaLabel', {
    values: { activePage, totalPages },
    defaultMessage: 'events; Page {activePage} of {totalPages}',
  });

export const SEARCH_BOX_TIMELINE_PLACEHOLDER = (timelineType: TimelineType) =>
  i18n.translate('xpack.securitySolution.timeline.searchBoxPlaceholder', {
    values: {
      timeline: timelineType === TimelineTypeEnum.template ? 'Timeline template' : 'Timeline',
    },
    defaultMessage: 'e.g. {timeline} name or description',
  });

export const TIMELINE_TEMPLATE = i18n.translate(
  'xpack.securitySolution.timeline.flyoutTimelineTemplateLabel',
  {
    defaultMessage: 'Timeline template',
  }
);

export const PARTICIPANTS = i18n.translate('xpack.securitySolution.timeline.participantsTitle', {
  defaultMessage: 'Participants',
});
