/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { FLYOUT_ORIGIN, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../../common/lib/telemetry';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import { useFlyoutSessionContext } from '../../../flyout_v2/session_context';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { InvestigationTimelineFlyout } from './timeline_flyout';
import type { InvestigationTimelineEvent } from './types';

const OpenTimelineOnMount = ({
  title,
  events,
}: {
  title: string;
  events: InvestigationTimelineEvent[];
}) => {
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
      <InvestigationTimelineFlyout title={title} events={events} />,
      {
        ...defaultProperties,
        historyKey,
        session,
        title,
      },
      {
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_TIMELINE,
        session,
        origin: FLYOUT_ORIGIN.ATTACHMENT_SUMMARY,
      }
    );
  }, [defaultProperties, events, historyKey, openFlyout, session, title]);

  return null;
};

export interface InvestigationTimelineFlyoutOpenerProps {
  title: string;
  events: InvestigationTimelineEvent[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * The summary renders outside the Security app shell, so the opened flyout's dependencies are
 * re-established with `flyoutProviders`, the same way an alert summary row opens its flyout.
 */
export const InvestigationTimelineFlyoutOpener = ({
  title,
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
        window.console.warn('Attachment summary drill-down could not start Security', error);
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
    children: <OpenTimelineOnMount title={title} events={events} />,
  });
};
