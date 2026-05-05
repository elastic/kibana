/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useParams } from 'react-router-dom';
import { PanelWithTitle } from '../../common/components/panel_with_title';
import { MonitorTypeBadge } from '../../common/components/monitor_type_badge';
import { useMonitorLatestPing } from '../hooks/use_monitor_latest_ping';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { useGetUrlParams } from '../../../hooks';

export const RemoteMonitorDetailsPanel = () => {
  const { monitorId: configId } = useParams<{ monitorId: string }>();
  const { remoteName } = useGetUrlParams();
  const { latestPing, loading } = useMonitorLatestPing();
  const formatter = useDateFormat();

  if (loading || !latestPing) {
    return <EuiSkeletonText lines={6} />;
  }

  const url = latestPing.url?.full;
  const lastRunTimestamp = latestPing['@timestamp'];
  const monitorType = latestPing.monitor?.type;
  const tags = latestPing.tags;

  return (
    <PanelWithTitle
      paddingSize="m"
      margin="none"
      title={MONITOR_DETAILS_LABEL}
      titleLeftAlign
      hasBorder
    >
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="responsiveColumn"
        columnWidths={[2, 3]}
        compressed
        align="left"
        css={{ maxWidth: 550 }}
      >
        <EuiDescriptionListTitle>{URL_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription style={{ wordBreak: 'break-all' }}>
          {url ? (
            <EuiLink href={url} external data-test-subj="syntheticsRemoteMonitorDetailsPanelUrl">
              {url}
            </EuiLink>
          ) : (
            <EuiText color="subdued" size="s">
              {'--'}
            </EuiText>
          )}
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>{LAST_RUN_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {lastRunTimestamp ? formatter(lastRunTimestamp) : '--'}
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>{MONITOR_ID_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{configId}</EuiDescriptionListDescription>

        {monitorType && (
          <>
            <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <MonitorTypeBadge monitorType={monitorType} />
            </EuiDescriptionListDescription>
          </>
        )}

        {remoteName && (
          <>
            <EuiDescriptionListTitle>{REMOTE_CLUSTER_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{remoteName}</EuiDescriptionListDescription>
          </>
        )}

        {tags && tags.length > 0 && (
          <>
            <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <TagsList tags={tags} />
            </EuiDescriptionListDescription>
          </>
        )}
      </EuiDescriptionList>
    </PanelWithTitle>
  );
};

const MONITOR_DETAILS_LABEL = i18n.translate(
  'xpack.synthetics.remoteMonitorDetailsPanel.title',
  { defaultMessage: 'Monitor details' }
);

const URL_LABEL = i18n.translate('xpack.synthetics.remoteMonitorDetailsPanel.url', {
  defaultMessage: 'URL',
});

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.remoteMonitorDetailsPanel.lastRun', {
  defaultMessage: 'Last run',
});

const MONITOR_ID_LABEL = i18n.translate('xpack.synthetics.remoteMonitorDetailsPanel.monitorId', {
  defaultMessage: 'Monitor ID',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.remoteMonitorDetailsPanel.monitorType',
  { defaultMessage: 'Monitor type' }
);

const REMOTE_CLUSTER_LABEL = i18n.translate(
  'xpack.synthetics.remoteMonitorDetailsPanel.remoteCluster',
  { defaultMessage: 'Remote cluster' }
);

const TAGS_LABEL = i18n.translate('xpack.synthetics.remoteMonitorDetailsPanel.tags', {
  defaultMessage: 'Tags',
});
