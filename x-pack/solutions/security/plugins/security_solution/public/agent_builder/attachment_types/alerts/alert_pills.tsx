/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { encode } from '@kbn/rison';
import { FilterStateStore } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { DEFAULT_ALERTS_INDEX, APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { formatPageFilterSearchParam } from '../../../../common/utils/format_page_filter_search_param';
import {
  FLYOUT_DESCRIPTOR_KIND,
  type FlyoutDescriptor,
} from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';
import { FlyoutPill, LinkPill } from '../conversation_details/pills';
import { ALERTS_PILL_LABEL } from './translations';

/** Producers build the payload from a fields map, so values arrive as arrays. */
const firstValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

/**
 * Maps a `security.alert` attachment onto the document flyout descriptor, or `null` when the
 * payload identifies nothing (read-only row, agent-created prose).
 */
export const toAlertDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  const alert = (attachment.data as { alert?: unknown })?.alert;
  if (typeof alert !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(alert);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const { _id: id, _index: index } = parsed as Record<string, unknown>;
  const documentId = firstValue(id);
  const indexName = firstValue(index);

  return documentId && indexName
    ? { kind: FLYOUT_DESCRIPTOR_KIND.document, documentId, indexName }
    : null;
};

const buildIdsFilter = (ids: readonly string[]): Filter => ({
  meta: {
    alias: 'Alert Ids',
    negate: false,
    disabled: false,
    type: 'phrases',
    key: '_id',
    value: ids.join(),
    params: [...ids],
  },
  query: { bool: { filter: { ids: { values: [...ids] } } } },
  $state: { store: FilterStateStore.APP_STATE },
});

const ALL_STATUSES_PAGE_FILTER = encode(
  formatPageFilterSearchParam([
    {
      field_name: 'kibana.alert.workflow_status',
      title: 'Status',
      selected_options: ['open', 'acknowledged', 'in-progress', 'closed'],
    },
  ])
);

const buildTimerange = (createdAt: string) => {
  const from = new Date(new Date(createdAt).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return encode({
    global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
    timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  });
};

interface AlertPillProps {
  attachment: UnknownAttachment;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/** Pill for `security.alert` — always opens a flyout (always 1 alert per attachment). */
export const AlertPill = memo(({ attachment, resolveSecurityCanvasContext }: AlertPillProps) => {
  const descriptor = toAlertDescriptor(attachment);
  const resolveDescriptor = useCallback(() => Promise.resolve(descriptor), [descriptor]);

  if (!descriptor) return null;
  return (
    <FlyoutPill
      label={ALERTS_PILL_LABEL(1)}
      resolveDescriptor={resolveDescriptor}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );
});
AlertPill.displayName = 'AlertPill';

const AlertsSinglePill = memo(
  ({
    alertId,
    label,
    getSpaceId,
    resolveSecurityCanvasContext,
  }: {
    alertId: string;
    label: string;
    getSpaceId: () => Promise<string>;
    resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  }) => {
    const resolveDescriptor = useCallback(async (): Promise<FlyoutDescriptor | null> => {
      const spaceId = await getSpaceId();
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.documentFromPattern,
        documentId: alertId,
        indexName: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
      };
    }, [alertId, getSpaceId]);

    return (
      <FlyoutPill
        label={label}
        resolveDescriptor={resolveDescriptor}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );
  }
);
AlertsSinglePill.displayName = 'AlertsSinglePill';

interface AlertsPillProps {
  attachment: UnknownAttachment;
  application: ApplicationStart;
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Pill for `security.alerts` attachments.
 * - 1 alert → opens the alert flyout via documentFromPattern (index resolved by the flyout itself)
 * - N alerts → opens the Alerts page filtered by `_id`
 */
export const AlertsPill = memo(
  ({ attachment, application, getSpaceId, resolveSecurityCanvasContext }: AlertsPillProps) => {
    const data = attachment.data as { alertIds?: unknown } | undefined;
    const alertIds = Array.isArray(data?.alertIds)
      ? (data.alertIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];

    const count = alertIds.length;
    if (count === 0) return null;

    const label = ALERTS_PILL_LABEL(count);
    const createdAt = attachment.versionData?.createdAt ?? new Date().toISOString();

    if (count === 1) {
      return (
        <AlertsSinglePill
          alertId={alertIds[0]}
          label={label}
          getSpaceId={getSpaceId}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      );
    }

    const href = application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: `?${URL_PARAM_KEY.filters}=${encode([buildIdsFilter(alertIds)])}&${
        URL_PARAM_KEY.timerange
      }=${buildTimerange(createdAt)}&${URL_PARAM_KEY.pageFilter}=${ALL_STATUSES_PAGE_FILTER}`,
    });
    return <LinkPill label={label} href={href} />;
  }
);
AlertsPill.displayName = 'AlertsPill';
