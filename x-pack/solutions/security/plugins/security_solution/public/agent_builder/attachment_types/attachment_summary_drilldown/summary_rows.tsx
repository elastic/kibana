/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import { lastValueFrom } from 'rxjs';
import type { ISearchGeneric } from '@kbn/search-types';
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

const SEVERITY_LABELS: Record<string, string> = {
  critical: i18n.translate('xpack.securitySolution.agentBuilder.attachments.severity.critical', {
    defaultMessage: 'Critical',
  }),
  high: i18n.translate('xpack.securitySolution.agentBuilder.attachments.severity.high', {
    defaultMessage: 'High',
  }),
  medium: i18n.translate('xpack.securitySolution.agentBuilder.attachments.severity.medium', {
    defaultMessage: 'Medium',
  }),
  low: i18n.translate('xpack.securitySolution.agentBuilder.attachments.severity.low', {
    defaultMessage: 'Low',
  }),
};

const LazyFlyoutOpener = React.lazy(() =>
  import(
    /* webpackChunkName: "security_attachment_summary_flyout_opener" */
    './open_flyout_on_mount'
  ).then((m) => ({ default: m.AttachmentSummaryFlyoutOpener }))
);

const severityToColor = (severity?: string): string =>
  SEVERITY_COLOR[severity as keyof typeof SEVERITY_COLOR] ?? SEVERITY_COLOR.high;

const severityLabel = (severity?: string): string | undefined => {
  if (!severity) return undefined;
  return (
    SEVERITY_LABELS[severity.toLowerCase()] ?? severity.charAt(0).toUpperCase() + severity.slice(1)
  );
};

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
  /** Concrete backing index from the ES hit's _index field. */
  indexName: string;
  label: string;
  iconColor: string;
  severity?: string;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const AsyncAlertSummaryRow = ({
  alertId,
  indexName,
  label,
  iconColor,
  severity,
  resolveSecurityCanvasContext,
}: AsyncAlertSummaryRowProps) => {
  const [openCount, setOpenCount] = useState(0);

  const descriptor: FlyoutDescriptor = {
    kind: FLYOUT_DESCRIPTOR_KIND.document,
    documentId: alertId,
    indexName,
  };

  return (
    <AttachmentSummaryRow
      label={label}
      typeName={ALERT_TYPE_NAME}
      iconType="dot"
      iconColor={iconColor}
      iconLabel={severityLabel(severity)}
      onClick={() => setOpenCount((c) => c + 1)}
    >
      {openCount > 0 ? (
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
  /** Concrete backing index from _index, used to open the flyout. */
  indexName: string;
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
  search: ISearchGeneric;
}

const AlertsSectionFetcher = ({
  alertIds,
  getSpaceId,
  resolveSecurityCanvasContext,
  search,
}: AlertsSectionFetcherProps) => {
  const [resolvedAlerts, setResolvedAlerts] = useState<FetchedAlert[] | null | 'error'>(null);

  const alertIdsKey = alertIds.join(',');

  useEffect(() => {
    let cancelled = false;
    setResolvedAlerts(null);

    const ids = alertIdsKey.split(',').filter(Boolean);

    const doFetch = async () => {
      const spaceId = await getSpaceId();
      const alertIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

      const response = await lastValueFrom(
        search({
          params: {
            index: alertIndex,
            query: { terms: { _id: ids } },
            _source: ['kibana.alert.rule.name', 'kibana.alert.severity'],
            size: ids.length,
          },
        })
      );

      if (cancelled) return;

      const hits = (response.rawResponse.hits.hits ?? []) as Array<{
        _id: string;
        _index: string;
        _source?: Record<string, unknown>;
      }>;

      const fetched: FetchedAlert[] = hits.map(({ _id, _index, _source = {} }) => ({
        id: _id,
        indexName: _index,
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
        setResolvedAlerts('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [alertIdsKey, getSpaceId, search]);

  if (resolvedAlerts === null) {
    return <AlertsSectionSkeleton rowCount={alertIds.length} />;
  }

  if (resolvedAlerts === 'error') {
    const rows = alertIds.map((id) => (
      <AttachmentSummaryRow key={id} label={id} typeName={ALERT_TYPE_NAME} iconType="dot" />
    ));
    return <AttachmentSummaryGroup title={ALERTS_TITLE} rows={rows} />;
  }

  const rows = resolvedAlerts.map(({ id, indexName, label, severity }) => (
    <AsyncAlertSummaryRow
      key={id}
      alertId={id}
      indexName={indexName}
      label={label}
      iconColor={severityToColor(severity)}
      severity={severity}
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
  search: ISearchGeneric;
}

/**
 * Returns a section that fetches alert names and severities from ES at render time.
 * Shows a skeleton while loading; on error shows the raw alert IDs as read-only rows.
 */
export const renderAlertsSection = ({
  attachment,
  getSpaceId,
  resolveSecurityCanvasContext,
  search,
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
      search={search}
    />
  );
};
