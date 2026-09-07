/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { SessionViewIndex } from '../../common/types/v1';
import type { SessionViewDeps, SessionViewTelemetryKey } from '../types';
import { USAGE_COLLECTION_APP_NAME } from '../../common/constants';

// Initializing react-query
const queryClient = new QueryClient();

const SessionViewLazy = lazy(() => import('../components/session_view'));

export const ELASTIC_DEFEND_DATA_SOURCE = 'endpoint';
export const CLOUD_DEFEND_DATA_SOURCE = 'cloud_defend';
export const AUDITBEAT_DATA_SOURCE = 'auditbeat';

const SUPPORTED_PACKAGES = [
  ELASTIC_DEFEND_DATA_SOURCE,
  CLOUD_DEFEND_DATA_SOURCE,
  AUDITBEAT_DATA_SOURCE,
];
const INDEX_REGEX = new RegExp(`([a-z0-9_-]+\:)?[a-z0-9-.]*(${SUPPORTED_PACKAGES.join('|')})`, 'i');

export const DEFAULT_INDEX = 'logs-*';
export const CLOUD_DEFEND_INDEX = 'logs-cloud_defend.*';
export const ENDPOINT_INDEX = 'logs-endpoint.events.process*';
export const AUDITBEAT_INDEX = 'auditbeat-*';

const sessionViewIntegrationIndices: Record<string, SessionViewIndex> = {
  endpoint: ENDPOINT_INDEX,
  cloud_defend: CLOUD_DEFEND_INDEX,
  auditbeat: AUDITBEAT_INDEX,
};

// Currently both logs-endpoint.events.process* and logs-cloud_defend.process* are valid sources for session data.
// To avoid cross cluster searches, the original index of the event is used to infer the index to find data for the
// rest of the session.
export const getIndexPattern = (eventIndex?: string | null) => {
  if (!eventIndex) {
    return DEFAULT_INDEX;
  }

  const match = eventIndex.match(INDEX_REGEX);
  const cluster = match?.[1];

  const clusterStr = cluster ? `${cluster}` : '';

  const service = match?.[2];

  const index: SessionViewIndex = service ? sessionViewIntegrationIndices[service] : DEFAULT_INDEX;

  return clusterStr + index;
};

/**
 * Session View cannot yet fan a session's reads out across CPS-linked projects: the process tree
 * reads and the alert overlay resolve against the origin project only, so a session that lives in a
 * linked project (its `index` carries a project/CCS prefix) would render an incomplete and
 * potentially misleading view. Until cross-project support lands, surface a clear "unsupported"
 * message instead of a partial tree.
 */
const CrossProjectUnsupportedPrompt = () => (
  <EuiEmptyPrompt
    data-test-subj="sessionView:crossProjectUnsupported"
    iconType="info"
    title={
      <h2>
        <FormattedMessage
          id="xpack.sessionView.crossProjectUnsupportedTitle"
          defaultMessage="Session View is not available for linked projects"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.sessionView.crossProjectUnsupportedBody"
          defaultMessage="This session is in a linked project. Open it from that project to view it (cross-project search isn't supported yet)."
        />
      </p>
    }
  />
);

export const getSessionViewLazy = (
  props: SessionViewDeps & { usageCollection?: UsageCollectionStart }
) => {
  const index = getIndexPattern(props.index);

  if (isNonLocalIndexName(index)) {
    return <CrossProjectUnsupportedPrompt />;
  }

  const trackEvent = (key: SessionViewTelemetryKey) => {
    if (props.usageCollection) {
      props.usageCollection.reportUiCounter(USAGE_COLLECTION_APP_NAME, METRIC_TYPE.CLICK, key);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <SessionViewLazy {...props} index={index} trackEvent={trackEvent} />
      </Suspense>
    </QueryClientProvider>
  );
};
