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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { frequencyStr } from '../../../common/components/monitor_details_panel';
import { MonitorTypeBadge } from '../../../common/components/monitor_type_badge';
import { useDateFormat } from '../../../../../../hooks/use_date_format';
import type { Ping } from '../../../../../../../common/runtime_types';
import type { OverviewStatusMetaData } from '../types';

interface Props {
  monitor: OverviewStatusMetaData;
  latestPing?: Ping;
}

export function RemoteMonitorDetailsPanel({ monitor, latestPing }: Props) {
  const formatter = useDateFormat();
  const url = latestPing?.url?.full ?? monitor.urls;
  const lastRunTimestamp = latestPing?.['@timestamp'];

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
      <EuiTitle size="xs">
        <h3>{MONITOR_DETAILS_LABEL}</h3>
      </EuiTitle>
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
            <EuiLink data-test-subj="syntheticsRemoteMonitorDetailsPanelLink" href={url} external>
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
          {lastRunTimestamp ? (
            <time dateTime={lastRunTimestamp}>{formatter(lastRunTimestamp)}</time>
          ) : (
            <EuiText color="subdued" size="s">
              {'--'}
            </EuiText>
          )}
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>{MONITOR_ID_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{monitor.configId}</EuiDescriptionListDescription>

        <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <MonitorTypeBadge monitorType={monitor.type} />
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>{FREQUENCY_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {monitor.schedule ? frequencyStr({ number: monitor.schedule, unit: 'm' }) : '--'}
        </EuiDescriptionListDescription>

        {monitor.tags.length > 0 && (
          <>
            <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{monitor.tags.join(', ')}</EuiDescriptionListDescription>
          </>
        )}

        <EuiDescriptionListTitle>{REMOTE_CLUSTER_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{monitor.remote?.remoteName}</EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiPanel>
  );
}

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.flyout.remoteMonitorDetails', {
  defaultMessage: 'Monitor details',
});

const URL_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.url', {
  defaultMessage: 'URL',
});

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.lastRun', {
  defaultMessage: 'Last run',
});

const MONITOR_ID_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.monitorId', {
  defaultMessage: 'Monitor ID',
});

const MONITOR_TYPE_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.monitorType', {
  defaultMessage: 'Monitor type',
});

const FREQUENCY_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.frequency', {
  defaultMessage: 'Frequency',
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.tags', {
  defaultMessage: 'Tags',
});

const REMOTE_CLUSTER_LABEL = i18n.translate('xpack.synthetics.flyout.remoteDetails.remoteCluster', {
  defaultMessage: 'Remote cluster',
});
