/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useInitDataViewManager } from '../../../data_view_manager/hooks/use_init_data_view_manager';
import { useDataViewManagerStatus } from '../../../data_view_manager/hooks/use_data_view_manager_status';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { ConversationFlyoutHost } from './conversation_flyout_host';

/** The app shell normally does this; without it the opened flyout spins forever. */
const DataViewManagerBootstrap = () => {
  const initDataViewManager = useInitDataViewManager();
  const status = useDataViewManagerStatus();

  useEffect(() => {
    // Only from `pristine`. The init listener reports failure by dispatching `error` and showing
    // a toast, so retrying on `error` would spin: init, fail, toast, init again, for as long as
    // the flyout stays mounted.
    if (status === 'pristine') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, status]);

  return null;
};

const OpenFlyoutOnMount = ({ descriptor }: { descriptor: FlyoutDescriptor }) => {
  const api = useFlyoutApi();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (hasOpened.current) {
      return;
    }
    hasOpened.current = true;
    openDescriptorAsStart(descriptor, {}, api, FLYOUT_ORIGIN.ATTACHMENT_SUMMARY);
  }, [descriptor, api]);

  return null;
};

export interface GroupedAttachmentFlyoutOpenerProps {
  descriptor: FlyoutDescriptor;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

export const GroupedAttachmentFlyoutOpener = ({
  descriptor,
  resolveSecurityCanvasContext,
}: GroupedAttachmentFlyoutOpenerProps) => (
  <ConversationFlyoutHost resolveSecurityCanvasContext={resolveSecurityCanvasContext}>
    <DataViewManagerBootstrap />
    <OpenFlyoutOnMount descriptor={descriptor} />
  </ConversationFlyoutHost>
);
