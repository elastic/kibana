/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { encode } from '@kbn/rison';

/**
 * Gets timeline redirect url
 * Duplicate of src/platform/plugins/shared/discover/public/context_awareness/profile_providers/security/utils/index.tsx
 */
const getSecurityTimelineRedirectUrl = ({
  from,
  to,
  index,
  eventId,
  baseURL,
}: {
  from?: string;
  to?: string;
  eventId?: string;
  index: string;
  baseURL: string;
}) => {
  let timelineTimerangeSearchParam = {};
  if (from && to) {
    timelineTimerangeSearchParam = {
      timeline: {
        timerange: {
          from,
          to,
          kind: 'absolute',
          linkTo: false,
        },
      },
    };
  }

  const query = {
    kind: 'kuery',
    expression: `_id: ${eventId}`,
  };

  const timelineSearchParam = {
    activeTab: 'query',
    query,
    isOpen: true,
  };

  const timelineFlyoutSearchParam = {
    right: {
      id: 'document-details-right',
      params: {
        id: eventId,
        indexName: index,
        scopeId: 'timeline-1',
      },
    },
  };

  const encodedTimelineParam = encode(timelineSearchParam);
  const encodedTimelineTimerangeParam = encode(timelineTimerangeSearchParam);
  const encodedTimelineFlyoutParam = encode(timelineFlyoutSearchParam);

  const urlParams = new URLSearchParams({
    timeline: encodedTimelineParam,
    timerange: encodedTimelineTimerangeParam,
    timelineFlyout: encodedTimelineFlyoutParam,
  });

  return `${baseURL}?${urlParams.toString()}`;
};

/**
 * Computes the URL used by the "Explore in Alerts / Explore in Timeline" action.
 *
 * Duplicate of src/platform/plugins/shared/discover/public/context_awareness/profile_providers/security/components/alert_event_overview.tsx
 */
export const getExploreUrl = (hit: DataTableRecord, timelinesURL: string): string => {
  // Returning the url if it exists. This way we can navigate to the alerts page and open the flyout.
  const alertURL = getFieldValue(hit, 'kibana.alert.url') as string | undefined;
  if (alertURL) return alertURL;

  // For all non-alert documents, we open Timeline and the flyout.
  const documentId = getFieldValue(hit, '_id') as string;
  const index = (getFieldValue(hit, '_index') as string) ?? '';
  return getSecurityTimelineRedirectUrl({
    from: getFieldValue(hit, '@timestamp') as string,
    to: getFieldValue(hit, '@timestamp') as string,
    eventId: documentId,
    index,
    baseURL: timelinesURL,
  });
};
