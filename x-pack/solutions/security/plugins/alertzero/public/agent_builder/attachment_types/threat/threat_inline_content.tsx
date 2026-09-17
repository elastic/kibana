/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiDescriptionList, EuiPanel, EuiSkeletonText } from '@elastic/eui';
import { KbnWarningCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { QueryClientProvider, useQuery } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { THREAT_REPORT_API_PATH, THREAT_REPORT_API_VERSION } from './threat_report_api';
import { threatAttachmentQueryClient } from './query_client';
import { isValidThreatAttachmentData } from './types';
import type { ThreatAttachment, ThreatReportLiveData } from './types';

export const THREAT_ATTACHMENT_TEST_ID = 'alertzeroThreatAttachment';
export const THREAT_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroThreatAttachmentEmpty';
export const THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID = 'alertzeroThreatAttachmentUnavailable';

const cellStyles = css`
  overflow-wrap: anywhere;
`;

interface ThreatReportResponse {
  reportId?: string;
  content?: { title?: string };
  severity?: { level?: string; score?: number };
  source?: { name?: string };
}

const fetchThreatReport = async ({
  http,
  reportId,
  signal,
}: {
  http: HttpStart;
  reportId: string;
  signal?: AbortSignal;
}): Promise<ThreatReportLiveData> => {
  const response = await http.fetch<ThreatReportResponse>(
    THREAT_REPORT_API_PATH.replace('{reportId}', encodeURIComponent(reportId)),
    { version: THREAT_REPORT_API_VERSION, method: 'GET', signal }
  );
  return {
    title: response?.content?.title,
    severityLevel: response?.severity?.level,
    severityScore: response?.severity?.score,
    sourceName: response?.source?.name,
  };
};

const SEVERITY_COLOR_MAP: Record<string, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export interface ThreatAttachmentInlineContentProps
  extends AttachmentRenderProps<ThreatAttachment> {
  http: HttpStart;
}

const ThreatAttachmentInlineContentInner: React.FC<ThreatAttachmentInlineContentProps> = ({
  attachment,
  http,
}) => {
  const data = attachment?.data;
  const isValid = isValidThreatAttachmentData(data);
  const reportId = isValid ? data.report_id : undefined;

  const {
    isLoading,
    error,
    data: liveData,
  } = useQuery<ThreatReportLiveData, unknown>({
    queryKey: ['ALERTZERO_THREAT_ATTACHMENT', reportId],
    queryFn: ({ signal }) => fetchThreatReport({ http, reportId: reportId as string, signal }),
    enabled: reportId != null,
  });

  if (!isValid) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj={THREAT_ATTACHMENT_EMPTY_TEST_ID}
      >
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.empty.title', {
            defaultMessage: 'No threat report reference available',
          })}
        />
      </EuiPanel>
    );
  }

  // One shared fallback path covers 403 / 404 / 503 / route-absent — no status-code
  // branching. The captured fields render whenever the live fetch hasn't resolved yet
  // or failed for any reason.
  const useLive = !isLoading && !error && liveData != null;

  const title = useLive ? liveData?.title ?? data.title : data.title;
  const severityLevel = useLive ? liveData?.severityLevel ?? data.severity : data.severity;
  const severityScore = useLive ? liveData?.severityScore : undefined;
  const sourceName = useLive ? liveData?.sourceName ?? data.source : data.source;

  const hasAnyField = Boolean(title || severityLevel || sourceName);

  const listItems = [
    {
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.reportId', {
        defaultMessage: 'Report',
      }),
      description: <span css={cellStyles}>{data.report_id}</span>,
    },
  ];

  if (title) {
    listItems.push({
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.title', {
        defaultMessage: 'Title',
      }),
      description: <span css={cellStyles}>{title}</span>,
    });
  }

  if (severityLevel) {
    listItems.push({
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.severity', {
        defaultMessage: 'Severity',
      }),
      description: (
        <EuiBadge color={SEVERITY_COLOR_MAP[severityLevel] ?? 'hollow'}>
          {severityScore != null ? `${severityLevel} (${severityScore})` : severityLevel}
        </EuiBadge>
      ),
    });
  }

  if (sourceName) {
    listItems.push({
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.source', {
        defaultMessage: 'Source',
      }),
      description: <span css={cellStyles}>{sourceName}</span>,
    });
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={THREAT_ATTACHMENT_TEST_ID}
    >
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : (
        <>
          <EuiDescriptionList type="column" compressed listItems={listItems} />
          {!useLive && (
            <KbnInfoCallout
              announceOnMount
              size="s"
              data-test-subj={THREAT_ATTACHMENT_UNAVAILABLE_TEST_ID}
              title={
                hasAnyField
                  ? i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.captured', {
                      defaultMessage:
                        'Showing captured fields — the live report could not be resolved.',
                    })
                  : i18n.translate('xpack.alertzero.agentBuilder.attachments.threat.unavailable', {
                      defaultMessage: 'Report unavailable',
                    })
              }
            />
          )}
        </>
      )}
    </EuiPanel>
  );
};

export const ThreatAttachmentInlineContent: React.FC<ThreatAttachmentInlineContentProps> = (
  props
) => (
  <QueryClientProvider client={threatAttachmentQueryClient}>
    <ThreatAttachmentInlineContentInner {...props} />
  </QueryClientProvider>
);
