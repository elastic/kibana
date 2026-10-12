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
import { getOpenConversationFlyoutWidth } from '../grouped_attachments/conversation_flyout_width';
import { INVESTIGATION_IOCS_FLYOUT_TITLE, InvestigationIocsFlyout } from './iocs_flyout';
import type { IocCategoryRow } from './parse_iocs';

const OpenIocsOnMount = ({ categories }: { categories: IocCategoryRow[] }) => {
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
    // returns to the conversation flyout. Size is that flyout's current width.
    openFlyout(
      <InvestigationIocsFlyout categories={categories} />,
      {
        ...defaultProperties,
        historyKey,
        session,
        type: 'push',
        size: getOpenConversationFlyoutWidth() ?? 's',
        maxWidth: false,
        resizable: true,
        paddingSize: 'l',
        title: INVESTIGATION_IOCS_FLYOUT_TITLE,
      },
      {
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_IOCS,
        session,
        origin: FLYOUT_ORIGIN.ATTACHMENTS_OVERVIEW,
      },
      undefined,
      { persistWidth: false }
    );
  }, [categories, defaultProperties, historyKey, openFlyout, session]);

  return null;
};

export interface InvestigationIocsFlyoutOpenerProps {
  categories: IocCategoryRow[];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * The overview renders outside the Security app shell, so the opened flyout's dependencies are
 * re-established with `flyoutProviders`, the same way an alert row opens its flyout.
 */
export const InvestigationIocsFlyoutOpener = ({
  categories,
  resolveSecurityCanvasContext,
}: InvestigationIocsFlyoutOpenerProps) => {
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
        window.console.warn('Investigation IOCs flyout could not start Security', error);
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
        value={{
          session: 'start',
          historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
          type: 'push',
        }}
      >
        <OpenIocsOnMount categories={categories} />
      </FlyoutSessionContextProvider>
    ),
  });
};
