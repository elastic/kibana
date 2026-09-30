/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AttachmentSummaryGroup, AttachmentSummaryRow } from '@kbn/agentic-investigations-common';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { parseTimelineEvents } from './parse_timeline_events';
import type { InvestigationTimelineEvent } from './types';

const TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.summaryTitle',
  { defaultMessage: 'Attack timeline' }
);

const TIMELINE_TYPE_NAME = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.summaryTypeLabel',
  { defaultMessage: 'Timeline' }
);

const LazyTimelineFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_investigation_timeline_flyout" */
    './open_timeline_flyout_on_mount'
  ).then((module) => ({ default: module.InvestigationTimelineFlyoutOpener }))
);

interface TimelineSummaryRowProps {
  label: string;
  events: InvestigationTimelineEvent[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const TimelineSummaryRow = ({
  label,
  events,
  resolveSecurityCanvasContext,
}: TimelineSummaryRowProps) => {
  const [openCount, setOpenCount] = useState(0);

  return (
    <AttachmentSummaryRow
      label={label}
      typeName={TIMELINE_TYPE_NAME}
      iconType="timeline"
      onClick={() => setOpenCount((count) => count + 1)}
    >
      {openCount > 0 ? (
        <div css={css({ display: 'none' })} key={openCount}>
          <Suspense fallback={null}>
            <LazyTimelineFlyoutOpener
              title={label}
              events={events}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            />
          </Suspense>
        </div>
      ) : null}
    </AttachmentSummaryRow>
  );
};

/** One clickable row for an attack-timeline attachment. The full timeline opens in a flyout. */
export const renderInvestigationTimelineSummary = (
  attachment: { data?: unknown },
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>
): ReactNode => {
  const events = parseTimelineEvents(attachment.data);
  if (events.length === 0) {
    return null;
  }

  return (
    <AttachmentSummaryGroup
      title={TIMELINE_TITLE}
      rows={[
        <TimelineSummaryRow
          key="timeline"
          label={events[0].host}
          events={events}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />,
      ]}
    />
  );
};
