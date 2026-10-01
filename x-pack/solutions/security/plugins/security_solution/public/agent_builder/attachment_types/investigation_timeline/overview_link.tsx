/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { parseTimelineEvents } from './parse_timeline_events';
import type { InvestigationTimelineEvent } from './types';

const TIMELINE_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.overviewLinkText',
  { defaultMessage: 'Timeline' }
);

const LazyTimelineFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_investigation_timeline_flyout" */
    './open_timeline_flyout_on_mount'
  ).then((m) => ({ default: m.InvestigationTimelineFlyoutOpener }))
);

interface TimelineOverviewLinkProps {
  events: InvestigationTimelineEvent[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const TimelineOverviewLink = ({
  events,
  resolveSecurityCanvasContext,
}: TimelineOverviewLinkProps) => {
  const [openCount, setOpenCount] = useState(0);

  return (
    <EuiText size="s">
      <EuiLink
        color="primary"
        data-test-subj="investigationTimelineOverviewLink"
        onClick={(event) => {
          event.currentTarget.blur();
          setOpenCount((count) => count + 1);
        }}
      >
        {TIMELINE_LINK_TEXT}
      </EuiLink>
      {openCount > 0 ? (
        <div css={css({ display: 'none' })} key={openCount}>
          <Suspense fallback={null}>
            <LazyTimelineFlyoutOpener
              events={events}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            />
          </Suspense>
        </div>
      ) : null}
    </EuiText>
  );
};

/** Timeline link for the conversation details flyout. The click opens the timeline flyout. */
export const renderInvestigationTimelineDetails = (
  attachment: { data?: unknown },
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>
): ReactNode => {
  const events = parseTimelineEvents(attachment.data);
  if (events.length === 0) {
    return null;
  }

  return (
    <TimelineOverviewLink
      events={events}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );
};
