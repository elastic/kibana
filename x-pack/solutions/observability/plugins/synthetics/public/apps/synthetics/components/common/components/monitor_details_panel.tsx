/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiDescriptionList,
  EuiSkeletonText,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { isEmpty } from 'lodash';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { PanelWithTitle } from './panel_with_title';
import { MonitorEnabled } from '../../monitors_page/management/monitor_list_table/monitor_enabled';
import { getMonitorAction } from '../../../state';
import { LocationsStatus } from '../../monitor_details/monitor_summary/locations_status';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  MonitorFields,
  Ping,
  SyntheticsMonitorWithId,
} from '../../../../../../common/runtime_types';
import { MonitorTypeBadge } from './monitor_type_badge';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { useGetUrlParams } from '../../../hooks';

export interface MonitorDetailsPanelProps {
  latestPing?: Ping;
  loading: boolean;
  configId: string;
  monitor: SyntheticsMonitorWithId | EncryptedSyntheticsSavedMonitor | null;
  hideEnabled?: boolean;
  hideLocations?: boolean;
  hasBorder?: boolean;
}

export const MonitorDetailsPanel = ({
  monitor,
  latestPing,
  loading,
  configId,
  hideEnabled = false,
  hideLocations = false,
  hasBorder = true,
}: MonitorDetailsPanelProps) => {
  const dispatch = useDispatch();
  const { space } = useKibanaSpace();
  const { spaceId } = useGetUrlParams();

  if (!monitor) {
    return <EuiSkeletonText lines={8} />;
  }

  const url = latestPing?.url?.full ?? (monitor as unknown as MonitorFields)[ConfigKey.URLS];
  const labels = monitor[ConfigKey.LABELS];

  return (
    <PanelWithTitle
      paddingSize="m"
      margin="none"
      title={MONITOR_DETAILS_LABEL}
      titleLeftAlign
      hasBorder={hasBorder}
    >
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" columnWidths={[2, 3]} compressed align="left">
        {!hideEnabled && (
          <>
            <EuiDescriptionListTitle>{ENABLED_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {monitor && (
                <MonitorEnabled
                  initialLoading={loading}
                  configId={configId}
                  monitor={monitor}
                  reloadPage={() => {
                    dispatch(
                      getMonitorAction.get({
                        monitorId: configId,
                        ...(spaceId && spaceId !== space?.id ? { spaceId } : {}),
                      })
                    );
                  }}
                />
              )}
            </EuiDescriptionListDescription>
          </>
        )}
        <EuiDescriptionListTitle>{URL_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription style={{ wordBreak: 'break-all' }}>
          {url ? (
            <EuiLink data-test-subj="syntheticsMonitorDetailsPanelLink" href={url} external>
              {url}
            </EuiLink>
          ) : (
            <EuiText color="subdued" size="s">
              {UN_AVAILABLE_LABEL}
            </EuiText>
          )}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{LAST_RUN_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {latestPing?.timestamp ? (
            <Time timestamp={latestPing?.timestamp} />
          ) : (
            <EuiText color="subdued">
              {i18n.translate('xpack.synthetics.monitorDetailsPanel.TextLabel', {
                defaultMessage: '--',
              })}
            </EuiText>
          )}
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{LAST_MODIFIED_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <Time timestamp={monitor.updated_at} />
        </EuiDescriptionListDescription>
        {monitor[ConfigKey.PROJECT_ID] && (
          <>
            <EuiDescriptionListTitle>{PROJECT_ID_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {monitor[ConfigKey.PROJECT_ID]}
            </EuiDescriptionListDescription>
          </>
        )}
        <EuiDescriptionListTitle>{MONITOR_ID_ITEM_TEXT}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{monitor.id}</EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{MONITOR_TYPE_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <MonitorTypeBadge monitorType={monitor.type} />
        </EuiDescriptionListDescription>
        <EuiDescriptionListTitle>{FREQUENCY_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {frequencyStr(monitor[ConfigKey.SCHEDULE])}
        </EuiDescriptionListDescription>

        {!hideLocations && (
          <>
            <EuiDescriptionListTitle>{LOCATIONS_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <LocationsStatus configId={configId} monitorLocations={monitor.locations} />
            </EuiDescriptionListDescription>
          </>
        )}

        <EuiDescriptionListTitle>{TAGS_LABEL}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <TagsList tags={monitor[ConfigKey.TAGS]} />
        </EuiDescriptionListDescription>

        {!isEmpty(labels) ? (
          <>
            <EuiDescriptionListTitle>{LABELS_LABEL}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {Object.entries(labels ?? {}).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}</strong>: {value}
                </div>
              ))}
            </EuiDescriptionListDescription>
          </>
        ) : null}
      </EuiDescriptionList>
    </PanelWithTitle>
  );
};

export function frequencyStr(frequency: { number: string; unit: string }) {
  return translateUnitMessage(
    `${frequency.number} ${unitToString(frequency.unit, parseInt(frequency.number, 10))}`
  );
}

function unitToString(unit: string, n: number) {
  switch (unit) {
    case 's':
      return secondsString(n);
    case 'm':
      return minutesString(n);
    case 'h':
      return hoursString(n);
    case 'd':
      return daysString(n);
    default:
      return unit;
  }
}

const secondsString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.seconds', {
    defaultMessage: '{n, plural, one {second} other {seconds}}',
    values: { n },
  });

const minutesString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.minutes', {
    defaultMessage: '{n, plural, one {minute} other {minutes}}',
    values: { n },
  });

const hoursString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.hours', {
    defaultMessage: '{n, plural, one {hour} other {hours}}',
    values: { n },
  });

const daysString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.days', {
    defaultMessage: '{n, plural, one {day} other {days}}',
    values: { n },
  });

function translateUnitMessage(unitMsg: string) {
  return i18n.translate('xpack.synthetics.monitorList.flyout.unitStr', {
    defaultMessage: 'Every {unitMsg}',
    values: { unitMsg },
    description: 'This displays a message like "Every 10 minutes" or "Every 30 seconds"',
  });
}

const Time = ({ timestamp }: { timestamp?: string }) => {
  const formatter = useDateFormat();
  const dateTimeFormatted = formatter(timestamp);

  return timestamp ? <time dateTime={timestamp}>{dateTimeFormatted}</time> : null;
};

const FREQUENCY_LABEL = i18n.translate('xpack.synthetics.management.monitorList.frequency', {
  defaultMessage: 'Frequency',
});
const LOCATIONS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.locations', {
  defaultMessage: 'Locations',
});

const URL_LABEL = i18n.translate('xpack.synthetics.management.monitorList.url', {
  defaultMessage: 'URL',
});

const TAGS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.tags', {
  defaultMessage: 'Tags',
});

const LABELS_LABEL = i18n.translate('xpack.synthetics.management.monitorList.labels', {
  defaultMessage: 'Labels',
});

const ENABLED_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails.enabled', {
  defaultMessage: 'Enabled (all locations)',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.detailsPanel.monitorDetails.monitorType',
  {
    defaultMessage: 'Monitor type',
  }
);

const MONITOR_DETAILS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.monitorDetails', {
  defaultMessage: 'Monitor details',
});

const LAST_MODIFIED_LABEL = i18n.translate('xpack.synthetics.monitorList.lastModified', {
  defaultMessage: 'Last modified',
});

const LAST_RUN_LABEL = i18n.translate('xpack.synthetics.monitorList.lastRunHeaderText', {
  defaultMessage: 'Last run',
});

const PROJECT_ID_LABEL = i18n.translate('xpack.synthetics.monitorList.projectIdHeaderText', {
  defaultMessage: 'Project ID',
});

const MONITOR_ID_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.monitorIdItemText', {
  defaultMessage: 'Monitor ID',
});

const UN_AVAILABLE_LABEL = i18n.translate('xpack.synthetics.monitorList.unAvailable', {
  defaultMessage: '(unavailable)',
});
