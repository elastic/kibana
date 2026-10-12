/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import type { ComponentType } from 'react';
import { css } from '@emotion/react';
import { GroupedAttachmentRow } from '@kbn/agentic-investigations-common';
import type { FlyoutGroupedAttachmentRendererProps } from '@kbn/agentic-investigations-common';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { TIMELINE_TITLE, ENDPOINT_ANALYSIS_SUBTITLE } from '../grouped_attachments';
import { parseTimelineEvents } from './parse_timeline_events';
import type { InvestigationTimelineEvent } from './types';

const LazyTimelineFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_investigation_timeline_flyout" */
    './open_timeline_flyout_on_mount'
  ).then((m) => ({ default: m.InvestigationTimelineFlyoutOpener }))
);

export interface TimelineGroupRendererDeps {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const TimelineRow = ({
  events,
  resolveSecurityCanvasContext,
}: {
  events: InvestigationTimelineEvent[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}) => {
  const [openCount, setOpenCount] = useState(0);
  const handleClick = useCallback(() => setOpenCount((count) => count + 1), []);

  return (
    <GroupedAttachmentRow
      iconType="clock"
      iconColor="subdued"
      title={TIMELINE_TITLE}
      subtitle={ENDPOINT_ANALYSIS_SUBTITLE}
      action={{ kind: 'flyout', onClick: handleClick }}
    >
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
    </GroupedAttachmentRow>
  );
};

const firstTimelineRow = (
  attachments: UnknownAttachment[]
): { id: string; events: InvestigationTimelineEvent[] } | undefined => {
  for (const attachment of attachments) {
    const events = parseTimelineEvents(attachment.data);
    if (events.length > 0) {
      return { id: attachment.id, events };
    }
  }
};

export const createTimelineGroupRenderer = ({
  resolveSecurityCanvasContext,
}: TimelineGroupRendererDeps): ComponentType<FlyoutGroupedAttachmentRendererProps> => {
  const TimelineGroupRenderer = ({ attachments }: FlyoutGroupedAttachmentRendererProps) => {
    const timelineRow = firstTimelineRow(attachments);
    return (
      <>
        {timelineRow ? (
          <TimelineRow
            key={timelineRow.id}
            events={timelineRow.events}
            resolveSecurityCanvasContext={resolveSecurityCanvasContext}
          />
        ) : null}
      </>
    );
  };
  return TimelineGroupRenderer;
};
