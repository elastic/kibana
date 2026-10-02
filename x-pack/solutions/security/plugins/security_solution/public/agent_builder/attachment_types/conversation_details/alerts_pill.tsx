/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { encode } from '@kbn/rison';
import { lastValueFrom } from 'rxjs';
import type { ISearchGeneric } from '@kbn/search-types';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { DEFAULT_ALERTS_INDEX, APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { formatPageFilterSearchParam } from '../../../../common/utils/format_page_filter_search_param';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { useFlyoutPill } from './use_flyout_pill';
import { LinkPill } from './attachment_pill';
import { CONVERSATION_DETAILS_LABELS } from './translations';

const buildIdsFilter = (ids: readonly string[]) => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  $state: { store: 'appState' },
  meta: {
    alias: null,
    disabled: false,
    key: '_id',
    negate: false,
    params: ids.length === 1 ? { query: ids[0] } : [...ids],
    type: ids.length === 1 ? 'phrase' : 'phrases',
  },
  query: { ids: { values: [...ids] } },
});

const buildTimerange = (createdAt: string) => {
  const from = new Date(new Date(createdAt).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return encode({
    global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
    timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  });
};

const ALL_STATUSES_PAGE_FILTER = encode(
  formatPageFilterSearchParam([
    {
      field_name: 'kibana.alert.workflow_status',
      title: 'Status',
      selected_options: ['open', 'acknowledged', 'in-progress', 'closed'],
    },
  ])
);

interface AlertsPillProps {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  getSpaceId: () => Promise<string>;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const AlertsSinglePill = memo(
  ({
    alertId,
    resolveSecurityCanvasContext,
    getSpaceId,
    search,
    label,
  }: {
    alertId: string;
    resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
    getSpaceId: () => Promise<string>;
    search: ISearchGeneric;
    label: string;
  }) => {
    const resolveDescriptor = useCallback(async () => {
      const spaceId = await getSpaceId();
      const index = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const result = await lastValueFrom(
        search({
          params: {
            index,
            body: { query: { ids: { values: [alertId] } }, size: 1, _source: false },
          },
        })
      );
      const hit = result.rawResponse.hits.hits[0];
      if (!hit) return null;
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.document,
        documentId: alertId,
        indexName: hit._index,
      } as const;
    }, [alertId, getSpaceId, search]);

    return <>{useFlyoutPill({ label, resolveDescriptor, resolveSecurityCanvasContext })}</>;
  }
);
AlertsSinglePill.displayName = 'AlertsSinglePill';

/**
 * Pill for `security.alerts` attachments.
 * - 1 alert → opens the alert flyout (resolves index via search)
 * - N alerts → opens the Alerts page filtered by `_id`
 */
export const AlertsPill = memo(
  ({
    attachment,
    application,
    getSpaceId,
    search,
    resolveSecurityCanvasContext,
  }: AlertsPillProps) => {
    const data = attachment.data as { alertIds?: unknown } | undefined;
    const alertIds = Array.isArray(data?.alertIds)
      ? (data.alertIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];

    const count = alertIds.length;
    if (count === 0) return null;

    const label = CONVERSATION_DETAILS_LABELS.alerts(count);
    const createdAt = attachment.versionData?.createdAt ?? new Date().toISOString();

    if (count === 1) {
      return (
        <AlertsSinglePill
          alertId={alertIds[0]}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
          getSpaceId={getSpaceId}
          search={search}
          label={label}
        />
      );
    }

    const href = application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: `?filters=${encode([buildIdsFilter(alertIds)])}&timerange=${buildTimerange(
        createdAt
      )}&pageFilters=${ALL_STATUSES_PAGE_FILTER}`,
    });
    return <LinkPill label={label} href={href} />;
  }
);
AlertsPill.displayName = 'AlertsPill';
