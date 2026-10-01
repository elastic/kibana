/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { FLYOUT_ORIGIN, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../../common/lib/telemetry';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import {
  FlyoutSessionContextProvider,
  useFlyoutSessionContext,
} from '../../../flyout_v2/session_context';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
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
    // The timeline is carried by value, so it is not written into the flyout URL the way an
    // alert document id is. It still opens through the same system flyout as an alert row.
    openFlyout(
      <InvestigationTimelineFlyout events={events} />,
      {
        ...defaultProperties,
        historyKey,
        session,
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

/**
 * The overview renders outside the Security app shell, so the opened flyout's dependencies are
 * re-established with `flyoutProviders`, the same way an alert row opens its flyout.
 */
export const InvestigationTimelineFlyoutOpener = ({
  events,
  resolveSecurityCanvasContext,
}: InvestigationTimelineFlyoutOpenerProps) => {
  const [bundle, setBundle] = useState<SecurityCanvasEmbeddedBundle>();

  useEffect(() => {
    let isMounted = true;
    resolveSecurityCanvasContext()
      .then((resolved) => {
        if (isMounted) {
          setBundle(resolved);
        }
      })
      .catch((error) => {
        window.console.warn('Investigation timeline flyout could not start Security', error);
      });
    return () => {
      isMounted = false;
    };
  }, [resolveSecurityCanvasContext]);

  if (!bundle) {
    return null;
  }

  return flyoutProviders({
    services: bundle.kibanaServices,
    store: bundle.store,
    children: (
      <FlyoutSessionContextProvider
        value={{ session: 'start', historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY }}
      >
        <OpenTimelineOnMount events={events} />
      </FlyoutSessionContextProvider>
    ),
  });
};
