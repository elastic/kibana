/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLink,
  EuiSpacer,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { ENABLE_STATUS_ALERT } from '../../../overview/monitor_list/columns/translations';
import { monitorStatusSelector } from '../../../../state/selectors';
import { EnableMonitorAlert } from '../../../overview/monitor_list/columns/enable_alert';
import { MonitorSSLCertificate } from './ssl_certificate';
import * as labels from '../translations';
import { StatusByLocations } from './status_by_location';
import { useStatusBar } from './use_status_bar';
import { MonitorIDLabel, OverallAvailability } from '../translations';
import {
  PROJECT_LABEL,
  TAGS_LABEL,
  URL_LABEL,
} from '../../../../../../common/translations/translations';
import { MonitorLocations } from '../../../../../../common/runtime_types/monitor';
import { formatAvailabilityValue } from '../availability_reporting/availability_reporting';
import { MonitorRedirects } from './monitor_redirects';
import { MonitorTags } from '../../../common/monitor_tags';

export const renderMonitorType = (type: string | undefined) => {
  switch (type) {
    case 'http':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.http', {
        defaultMessage: 'HTTP',
      });
    case 'tcp':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.tcp', {
        defaultMessage: 'TCP',
      });
    case 'icmp':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.icmp', {
        defaultMessage: 'ICMP',
      });
    case 'browser':
      return i18n.translate('xpack.uptime.monitorDetails.statusBar.pingType.browser', {
        defaultMessage: 'Browser',
      });
    default:
      return '';
  }
};

export const MonitorStatusBar: React.FC = () => {
  const { monitorId, monitorStatus, monitorLocations = {} } = useStatusBar();

  const { locations, up_history: ups, down_history: downs } = monitorLocations as MonitorLocations;

  const full = monitorStatus?.url?.full ?? '';

  const availability = (ups === 0 && downs === 0) || !ups ? 0 : (ups / (ups + downs)) * 100;

  const selectedMonitor = useSelector(monitorStatusSelector);

  return (
    <>
      <div>
        <StatusByLocations locations={locations ?? []} />
      </div>
      <EuiSpacer />
      <EuiDescriptionList type="column" compressed={true} textStyle="reverse" columnWidths={[1, 3]}>
        <EuiDescriptionListTitle>{OverallAvailability}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription data-test-subj="uptimeOverallAvailability">
          <FormattedMessage
            id="xpack.uptime.availabilityLabelText"
            defaultMessage="{value} %"
            values={{ value: formatAvailabilityValue(availability) }}
            description="A percentage value, like 23.5 %"
          />
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{URL_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          data-test-subj="monitor-page-url"
          className="eui-textBreakAll"
        >
          {full ? (
            <EuiLink
              data-test-subj="syntheticsMonitorStatusBarLink"
              aria-label={labels.monitorUrlLinkAriaLabel}
              href={full}
              target="_blank"
              external
            >
              {full}
            </EuiLink>
          ) : (
            '--'
          )}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{MonitorIDLabel}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription data-test-subj="monitor-page-title">
          {monitorId}
        </EuiDescriptionListDescription>
        {monitorStatus?.monitor?.type && (
          <>
            <EuiDescriptionListTitle aria-label={labels.typeAriaLabel}>
              {labels.typeLabel}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="monitor-page-type">
              {renderMonitorType(monitorStatus?.monitor?.type)}
            </EuiDescriptionListDescription>
          </>
        )}
        <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <MonitorTags ping={monitorStatus} />
        </EuiDescriptionListDescription>
        {monitorStatus?.monitor?.project?.id && (
          <>
            <EuiDescriptionListTitle>{PROJECT_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {monitorStatus?.monitor?.project.id}
            </EuiDescriptionListDescription>
          </>
        )}
        <MonitorSSLCertificate tls={monitorStatus?.tls} />
        <MonitorRedirects monitorStatus={monitorStatus} />
        <EuiDescriptionListTitle>{ENABLE_STATUS_ALERT}</EuiDescriptionListTitle>
        {selectedMonitor && (
          <dd>
            <EnableMonitorAlert monitorId={monitorId} selectedMonitor={selectedMonitor} />
          </dd>
        )}
      </EuiDescriptionList>
    </>
  );
};
