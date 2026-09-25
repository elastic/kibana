/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import { lastValueFrom } from 'rxjs';
import type { IEsSearchRequest } from '@kbn/search-types';
import { i18n } from '@kbn/i18n';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentSummaryGroup,
  AttachmentSummaryRow,
  DEFAULT_COLLAPSED_COUNT,
} from '@kbn/agentic-investigations-common';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { SEVERITY_COLOR } from '../../../common/utils/risk_color_palette';
import { toAlertDescriptor } from './to_flyout_descriptor';

const ALERT_TYPE_NAME = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.alert.typeName',
  { defaultMessage: 'Alert' }
);

const ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.alerts.summaryTitle',
  { defaultMessage: 'Alerts' }
);

const LazyFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_attachment_summary_flyout_opener" */
    './open_flyout_on_mount'
  ).then((m) => ({ default: m.AttachmentSummaryFlyoutOpener }))
);

const severityToColor = (severity?: string): string =>
  SEVERITY_COLOR[severity as keyof typeof SEVERITY_COLOR] ?? SEVERITY_COLOR.high;

// e.g. "critical" → "Critical"
const severityLabel = (severity?: string): string | undefined =>
  severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : undefined;

const parseSingleAlertSeverity = (attachment: UnknownAttachment): string | undefined => {
  const alert = (attachment.data as { alert?: unknown })?.alert;
  if (typeof alert !== 'string') return undefined;
  try {
    const parsed = JSON.parse(alert);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const val = (parsed as Record<string, unknown>)['kibana.alert.severity'];
    if (typeof val === 'string') return val;
    if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
    return undefined;
  } catch {
    return undefined;
  }
};

const sourceField = (source: Record<string, unknown>, field: string): string | undefined => {
  const val = source[field];
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0] as string;
  return undefined;
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const severityRank = (s?: string): number => SEVERITY_ORDER[s ?? ''] ?? 4;

interface AlertSummaryRowProps {
  label: string;
  descriptor: FlyoutDescriptor | null;
  iconColor: string;
  severity?: string;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const AlertSummaryRow = ({
  label,
  descriptor,
  iconColor,
  severity,
  resolveSecurityCanvasContext,
}: AlertSummaryRowProps) => {
  const [openCount, setOpenCount] = useState(0);

  return (
    <AttachmentSummaryRow
      label={label}
      typeName={ALERT_TYPE_NAME}
      iconType="dot"
      iconColor={iconColor}
      iconLabel={severityLabel(severity)}
      onClick={descriptor ? () => setOpenCount((c) => c + 1) : undefined}
    >
      {openCount > 0 && descriptor ? (
        <div css={css({ display: 'none' })} key={openCount}>
          <Suspense fallback={null}>
            <LazyFlyoutOpener
              descriptor={descriptor}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            />
          </Suspense>
        </div>
      ) : null}
    </AttachmentSummaryRow>
  );
};

interface AsyncAlertSummaryRowProps {
  alertId: string;
  label: string;
  iconColor: string;
  severity?: string;
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

// Space id resolved on first click so row count is synchronous (drives Show more limit).
const AsyncAlertSummaryRow = ({
  alertId,
  label,
  iconColor,
  severity,
  getSpaceId,
  resolveSecurityCanvasContext,
}: AsyncAlertSummaryRowProps) => {
  const [openCount, setOpenCount] = useState(0);
  const [descriptor, setDescriptor] = useState<FlyoutDescriptor | null>(null);

  const handleClick = useCallback(async () => {
    let desc = descriptor;
    if (!desc) {
      const spaceId = await getSpaceId();
      desc = {
        kind: FLYOUT_DESCRIPTOR_KIND.document,
        documentId: alertId,
        indexName: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
      };
      setDescriptor(desc);
    }
    setOpenCount((c) => c + 1);
  }, [alertId, descriptor, getSpaceId]);

  return (
    <AttachmentSummaryRow
      label={label}
      typeName={ALERT_TYPE_NAME}
      iconType="dot"
      iconColor={iconColor}
      iconLabel={severityLabel(severity)}
      onClick={handleClick}
    >
      {openCount > 0 && descriptor ? (
        <div css={css({ display: 'none' })} key={openCount}>
          <Suspense fallback={null}>
            <LazyFlyoutOpener
              descriptor={descriptor}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            />
          </Suspense>
        </div>
      ) : null}
    </AttachmentSummaryRow>
  );
};

interface FetchedAlert {
  id: string;
  label: string;
  severity: string;
}

const AlertsSectionSkeleton = ({ rowCount }: { rowCount: number }) => {
  const { euiTheme } = useEuiTheme();
  const count = Math.min(rowCount, DEFAULT_COLLAPSED_COUNT);

  return (
    <div data-test-subj="attachmentSummaryGroupSkeleton">
      <div
        css={css({
          padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          borderBottom: euiTheme.border.thin,
        })}
      >
        <EuiSkeletonText lines={1} size="xs" />
      </div>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          css={css({
            padding: `12px ${euiTheme.size.base}`,
            ...(i > 0 ? { borderTop: euiTheme.border.thin } : {}),
          })}
        >
          <EuiSkeletonText lines={1} />
        </div>
      ))}
    </div>
  );
};

interface AlertsSectionFetcherProps {
  alertIds: string[];
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const AlertsSectionFetcher = ({
  alertIds,
  getSpaceId,
  resolveSecurityCanvasContext,
}: AlertsSectionFetcherProps) => {
  const [resolvedAlerts, setResolvedAlerts] = useState<FetchedAlert[] | null>(null);

  const alertIdsKey = alertIds.join(',');

  useEffect(() => {
    let cancelled = false;

    const ids = alertIdsKey.split(',').filter(Boolean);

    const doFetch = async () => {
      const [spaceId, { kibanaServices }] = await Promise.all([
        getSpaceId(),
        resolveSecurityCanvasContext(),
      ]);

      const alertIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      const response = await lastValueFrom(
        kibanaServices.data.search.search<IEsSearchRequest>({
          params: {
            index: alertIndex,
            body: {
              query: { terms: { _id: ids } },
              _source: ['kibana.alert.rule.name', 'kibana.alert.severity'],
              size: ids.length,
            },
          },
        })
      );

      if (cancelled) return;

      const hits = (response.rawResponse.hits.hits ?? []) as Array<{
        _id: string;
        _source?: Record<string, unknown>;
      }>;

      const fetched: FetchedAlert[] = hits.map(({ _id, _source = {} }) => ({
        id: _id,
        label: sourceField(_source, 'kibana.alert.rule.name') ?? _id,
        severity: sourceField(_source, 'kibana.alert.severity') ?? '',
      }));

      fetched.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

      if (!cancelled) {
        setResolvedAlerts(fetched);
      }
    };

    doFetch().catch(() => {
      if (!cancelled) {
        setResolvedAlerts([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [alertIdsKey, getSpaceId, resolveSecurityCanvasContext]);

  if (resolvedAlerts === null) {
    return <AlertsSectionSkeleton rowCount={alertIds.length} />;
  }

  const rows = resolvedAlerts.map(({ id, label, severity }) => (
    <AsyncAlertSummaryRow
      key={id}
      alertId={id}
      label={label}
      iconColor={severityToColor(severity)}
      severity={severity}
      getSpaceId={getSpaceId}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  ));

  return <AttachmentSummaryGroup title={ALERTS_TITLE} rows={rows} />;
};

export interface RenderAlertSectionParams {
  attachment: UnknownAttachment;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/** Returns a section with one row for a `security.alert` attachment. */
export const renderAlertSection = ({
  attachment,
  resolveSecurityCanvasContext,
}: RenderAlertSectionParams): ReactNode => {
  const label =
    (attachment.data as { attachmentLabel?: string })?.attachmentLabel ?? ALERT_TYPE_NAME;
  const descriptor = toAlertDescriptor(attachment);
  const severity = parseSingleAlertSeverity(attachment);

  return (
    <AttachmentSummaryGroup
      title={ALERTS_TITLE}
      rows={[
        <AlertSummaryRow
          key="alert"
          label={label}
          descriptor={descriptor}
          iconColor={severityToColor(severity)}
          severity={severity}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />,
      ]}
    />
  );
};

export interface RenderAlertsSectionParams {
  attachment: UnknownAttachment;
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

/**
 * Returns a section that fetches alert names and severities from ES at render time.
 * Only alerts that resolve are shown; unresolvable IDs are silently dropped.
 */
export const renderAlertsSection = ({
  attachment,
  getSpaceId,
  resolveSecurityCanvasContext,
}: RenderAlertsSectionParams): ReactNode => {
  const data = attachment.data as { alertIds?: unknown };
  const alertIds = data?.alertIds;
  if (!Array.isArray(alertIds) || alertIds.length === 0) return null;

  const ids = alertIds.filter((id): id is string => typeof id === 'string');
  if (ids.length === 0) return null;

  return (
    <AlertsSectionFetcher
      alertIds={ids}
      getSpaceId={getSpaceId}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );
};
