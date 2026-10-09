/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { FLYOUT_ORIGIN, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../../common/lib/telemetry';
import { useDefaultDocumentFlyoutProperties } from '../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import { useFlyoutSessionContext } from '../../../flyout_v2/session_context';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { ConversationFlyoutHost } from '../grouped_attachments/conversation_flyout_host';
import {
  INVESTIGATION_TIMELINE_FLYOUT_TITLE,
  InvestigationTimelineFlyout,
} from './timeline_flyout';
import type { InvestigationTimelineEvent } from './types';

const OpenTimelineOnMount = ({ events }: { events: InvestigationTimelineEvent[] }) => {
  const openFlyout = useOpenFlyout();
  const { session, historyKey } = useFlyoutSessionContext();
  const defaultProperties = useDefaultDocumentFlyoutProperties();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (hasOpened.current) {
      return;
    }
    hasOpened.current = true;
    // A new push flyout on the conversation history, so Back
    // returns to the conversation flyout.
    openFlyout(
      <InvestigationTimelineFlyout events={events} />,
      {
        ...defaultProperties,
        historyKey,
        session,
        type: 'push',
        resizable: true,
        paddingSize: 'l',
        title: INVESTIGATION_TIMELINE_FLYOUT_TITLE,
      },
      {
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_TIMELINE,
        session,
        origin: FLYOUT_ORIGIN.ATTACHMENTS_OVERVIEW,
      }
    );
  }, [defaultProperties, events, historyKey, openFlyout, session]);

  return null;
};

export interface InvestigationTimelineFlyoutOpenerProps {
  events: InvestigationTimelineEvent[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/** Opens the timeline flyout from the conversation overview. Timeline does not query, so it skips the data-view bootstrap. */
export const InvestigationTimelineFlyoutOpener = ({
  events,
  resolveSecurityCanvasContext,
}: InvestigationTimelineFlyoutOpenerProps) => (
  <ConversationFlyoutHost resolveSecurityCanvasContext={resolveSecurityCanvasContext}>
    <OpenTimelineOnMount events={events} />
  </ConversationFlyoutHost>
);
