/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { getAlertsIndex } from '../../../../common/entity_analytics/utils';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useInitDataViewManager } from '../../../data_view_manager/hooks/use_init_data_view_manager';
import { useDataViewManagerStatus } from '../../../data_view_manager/hooks/use_data_view_manager_status';
import { PageScope } from '../../../data_view_manager/constants';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { FlyoutSessionContextProvider } from '../../../flyout_v2/session_context';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { toFlyoutDescriptor } from './to_flyout_descriptor';

/**
 * The document and attack flyouts resolve their data view through the manager, which the app
 * shell initialises on startup. Nothing does that on an AlertZero surface, so the scope would
 * stay `pristine` and the opened flyout would spin forever.
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
 * Opens the attachment's flyout as soon as it can resolve one, then renders nothing. The indices
 * it needs arrive asynchronously with the data view manager, so the open is driven by the
 * descriptor becoming resolvable rather than by mount alone, and is guarded to fire once.
 */
const OpenFlyoutOnMount = ({ attachment }: { attachment: UnknownAttachment }) => {
  const api = useFlyoutApi();
  const spaceId = useSpaceId();
  const { dataView: attacksDataView } = useDataView(PageScope.attacks);
  const hasOpened = useRef(false);

  const descriptor = useMemo(
    () =>
      toFlyoutDescriptor(attachment, {
        alertsIndex: spaceId ? getAlertsIndex(spaceId) : undefined,
        attacksIndex: attacksDataView?.getIndexPattern(),
      }),
    [attachment, spaceId, attacksDataView]
  );

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
 * The summary lives on surfaces outside the Security app shell (AlertZero), so everything
 * `useFlyoutApi` depends on has to be re-established here. It uses `flyoutProviders` — the same
 * bundle the flyouts themselves mount with, and what the rule preview attachment uses for this
 * situation — rather than the lighter `SecurityReduxEmbeddedProvider`, which is built for the
 * entity canvas and supplies no react-query client, user privileges, ML capabilities or
 * entity-store API.
 *
 * It opens as a new top-level flyout (`session: 'start'`) sharing the investigation flyout's
 * history key, so it takes over the panel and EUI offers Back to return. Opening it as a child
 * (`'inherit'`) instead would leave the two side by side, because EUI picks that layout for a
 * child whenever the viewport has room for both. The history key is pinned rather than taken from
 * the ambient context, which resolves to Security's own key when the summary happens to render
 * inside the Security app and would put the two flyouts in different groups.
 */
export const AttachmentSummaryFlyoutOpener = ({
  attachment,
  resolveSecurityCanvasContext,
}: AttachmentSummaryFlyoutOpenerProps) => {
  const [bundle, setBundle] = useState<SecurityCanvasEmbeddedBundle>();

  useEffect(() => {
    let isMounted = true;
    resolveSecurityCanvasContext().then((resolved) => {
      if (isMounted) {
        setBundle(resolved);
      }
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
        <FlyoutSessionContextProvider
          value={{ session: 'start', historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY }}
        >
          <OpenFlyoutOnMount attachment={attachment} />
        </FlyoutSessionContextProvider>
      </>
    ),
  });
};
