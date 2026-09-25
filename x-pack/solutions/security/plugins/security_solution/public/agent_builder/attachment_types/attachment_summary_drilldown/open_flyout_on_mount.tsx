/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { useInitDataViewManager } from '../../../data_view_manager/hooks/use_init_data_view_manager';
import { useDataViewManagerStatus } from '../../../data_view_manager/hooks/use_data_view_manager_status';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { toFlyoutDescriptor } from './to_flyout_descriptor';

/**
 * The document flyout resolves its data view through the manager, which the app shell initialises
 * on startup. Nothing does that on an AlertZero surface, so the scope would stay `pristine` and
 * the opened flyout would spin forever.
 */
const DataViewManagerBootstrap = () => {
  const initDataViewManager = useInitDataViewManager();
  const status = useDataViewManagerStatus();

  useEffect(() => {
    if (status === 'pristine' || status === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, status]);

  return null;
};

/**
 * Opens the attachment's flyout on mount, then renders nothing. Guarded so a re-render cannot
 * open a second copy.
 */
const OpenFlyoutOnMount = ({ attachment }: { attachment: UnknownAttachment }) => {
  const api = useFlyoutApi();
  const hasOpened = useRef(false);

  const descriptor = useMemo(() => toFlyoutDescriptor(attachment), [attachment]);

  useEffect(() => {
    if (!descriptor || hasOpened.current) {
      return;
    }
    hasOpened.current = true;
    openDescriptorAsStart(descriptor, {}, api, FLYOUT_ORIGIN.ATTACHMENT_SUMMARY);
  }, [descriptor, api]);

  return null;
};

export interface AttachmentSummaryFlyoutOpenerProps {
  attachment: UnknownAttachment;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Drill-down for a row of the investigation flyout's attachment summary. The row mounts this for
 * its side effect only: it renders no UI of its own.
 *
 * The summary lives on surfaces outside the Security app shell, so everything `useFlyoutApi`
 * depends on has to be re-established here. It mounts `flyoutProviders` — the bundle the flyouts
 * themselves use, and what the rule preview attachment uses for this same situation — rather than
 * the lighter `SecurityReduxEmbeddedProvider`, which is built for the entity canvas and supplies
 * no react-query client, user privileges, ML capabilities or entity-store API.
 */
export const AttachmentSummaryFlyoutOpener = ({
  attachment,
  resolveSecurityCanvasContext,
}: AttachmentSummaryFlyoutOpenerProps) => {
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
        // Bootstrapping the Security sub-plugins can fail, and this component is mounted out of
        // view, so there is nowhere to show it. Left as a warning rather than an unhandled
        // rejection; the row simply does not open.
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
    children: (
      <>
        <DataViewManagerBootstrap />
        <OpenFlyoutOnMount attachment={attachment} />
      </>
    ),
  });
};
