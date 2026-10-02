/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { useInitDataViewManager } from '../../../data_view_manager/hooks/use_init_data_view_manager';
import { useDataViewManagerStatus } from '../../../data_view_manager/hooks/use_data_view_manager_status';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { FlyoutSessionContextProvider } from '../../../flyout_v2/session_context';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

const DataViewManagerBootstrap = () => {
  const initDataViewManager = useInitDataViewManager();
  const status = useDataViewManagerStatus();

  useEffect(() => {
    if (status === 'pristine') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, status]);

  return null;
};

const OpenFlyoutOnMount = ({
  resolveDescriptor,
}: {
  resolveDescriptor: () => Promise<FlyoutDescriptor | null>;
}) => {
  const api = useFlyoutApi();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (hasOpened.current) return;
    hasOpened.current = true;
    resolveDescriptor().then((descriptor) => {
      if (descriptor) {
        openDescriptorAsStart(descriptor, {}, api, FLYOUT_ORIGIN.ATTACHMENT_SUMMARY);
      }
    });
  }, [resolveDescriptor, api]);

  return null;
};

export interface ConversationDetailsFlyoutOpenerProps {
  resolveDescriptor: () => Promise<FlyoutDescriptor | null>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Resolves the Security app bundle (Redux store + services), then opens the appropriate flyout
 * on mount. The `historyKey` binds it to the investigation details flyout's session so the
 * Back button returns to the investigation.
 */
export const ConversationDetailsFlyoutOpener = ({
  resolveDescriptor,
  resolveSecurityCanvasContext,
}: ConversationDetailsFlyoutOpenerProps) => {
  const [bundle, setBundle] = useState<SecurityCanvasEmbeddedBundle>();

  useEffect(() => {
    let isMounted = true;
    resolveSecurityCanvasContext()
      .then((resolved) => {
        if (isMounted) setBundle(resolved);
      })
      .catch((error) => {
        window.console.warn('Investigation attachment flyout could not start Security', error);
      });
    return () => {
      isMounted = false;
    };
  }, [resolveSecurityCanvasContext]);

  if (!bundle) return null;

  return flyoutProviders({
    services: bundle.kibanaServices,
    store: bundle.store,
    children: (
      <FlyoutSessionContextProvider
        value={{ session: 'start', historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY }}
      >
        <DataViewManagerBootstrap />
        <OpenFlyoutOnMount resolveDescriptor={resolveDescriptor} />
      </FlyoutSessionContextProvider>
    ),
  });
};
