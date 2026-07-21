/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiInMemoryTable,
  EuiText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiButtonIcon,
  EuiToolTip,
  useIsWithinMinBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import moment from 'moment';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { Chart, BarSeries, Axis, Settings, ScaleType, Position, Tooltip } from '@elastic/charts';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  ErrorGroup,
  ErrorGroupItem,
  ErrorGroupHistogramBucket,
  ErrorGroupPattern,
} from '../../../../../../common/runtime_types';
import { ErrorDetailsLink } from '../../common/links/error_details_link';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { useSyntheticsSettingsContext } from '../../../contexts';
import type { ClientPluginsStart } from '../../../../../plugin';
import { ErrorPreviewFlyout } from './error_preview_flyout';

export const ErrorGroupsList = ({
  groups,
  loading,
}: {
  groups: ErrorGroup[];
  loading: boolean;
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [previewItem, setPreviewItem] = useState<ErrorGroupItem | null>(null);
  const formatter = useDateFormat();
  const { basePath } = useSyntheticsSettingsContext();
  const isTabletOrGreater = useIsWithinMinBreakpoint('s');

  const toggleRow = useCallback((groupName: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  }, []);

  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const group of groups) {
      if (expandedRows[group.name]) {
        map[group.name] = (
          <ExpandedGroupRow
            group={group}
            formatter={formatter}
            basePath={basePath}
            onPreview={setPreviewItem}
          />
        );
      }
    }
    return map;
  }, [expandedRows, groups, formatter, basePath]);

  const columns: Array<EuiBasicTableColumn<ErrorGroup>> = [
    {
      width: '40px',
      isExpander: true,
      render: (item: ErrorGroup) => (
        <EuiToolTip
          content={expandedRows[item.name] ? COLLAPSE_LABEL : EXPAND_LABEL}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj={`syntheticsErrorGroupExpand-${item.name}`}
            onClick={() => toggleRow(item.name)}
            aria-label={expandedRows[item.name] ? COLLAPSE_LABEL : EXPAND_LABEL}
            iconType={expandedRows[item.name] ? 'arrowDown' : 'arrowRight'}
          />
        </EuiToolTip>
      ),
    },
    {
      field: 'name',
      name: ERROR_GROUP_LABEL,
      width: '40%',
      render: (_name: string, item: ErrorGroup) => (
        <div>
          <EuiText size="s">
            <strong>{item.name}</strong>
          </EuiText>
          {item.sampleMessage !== item.name && (
            <EuiText
              size="xs"
              color="subdued"
              className="eui-textTruncate"
              title={item.sampleMessage}
            >
              {item.sampleMessage}
            </EuiText>
          )}
        </div>
      ),
    },
    {
      field: 'pattern',
      name: PATTERN_LABEL,
      sortable: true,
      width: '120px',
      render: (pattern: ErrorGroupPattern) => <PatternBadge pattern={pattern} />,
    },
    {
      field: 'count',
      name: OCCURRENCES_LABEL,
      sortable: true,
      align: 'right',
      width: '100px',
      render: (count: number) => <EuiBadge color="hollow">{count}</EuiBadge>,
    },
    {
      field: 'monitorCount',
      name: MONITORS_LABEL,
      sortable: true,
      align: 'right',
      width: '100px',
    },
    {
      field: 'locationCount',
      name: LOCATIONS_LABEL,
      sortable: true,
      align: 'right',
      width: '100px',
    },
    {
      field: 'firstSeen',
      name: FIRST_SEEN_LABEL,
      sortable: true,
      width: '110px',
      render: (value: string) =>
        value ? (
          <EuiToolTip content={formatter(value)}>
            <EuiText size="xs">{moment(value).fromNow()}</EuiText>
          </EuiToolTip>
        ) : (
          <>{'--'}</>
        ),
    },
    {
      field: 'lastSeen',
      name: LAST_SEEN_LABEL,
      sortable: true,
      width: '110px',
      render: (value: string) =>
        value ? (
          <EuiToolTip content={formatter(value)}>
            <EuiText size="xs">{moment(value).fromNow()}</EuiText>
          </EuiToolTip>
        ) : (
          <>{'--'}</>
        ),
    },
  ];

  return (
    <>
      <EuiInMemoryTable
        css={{ overflowX: isTabletOrGreater ? 'auto' : undefined }}
        tableLayout="auto"
        tableCaption={ERROR_GROUPS_CAPTION}
        loading={loading}
        items={groups}
        itemId="name"
        columns={columns}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        pagination={{ pageSizeOptions: [5, 10, 25] }}
        sorting={{
          sort: {
            field: 'count',
            direction: 'desc',
          },
        }}
      />
      {previewItem && (
        <ErrorPreviewFlyout error={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </>
  );
};

const PATTERN_CONFIG: Record<ErrorGroupPattern, { color: string; label: string }> = {
  persistent: {
    color: 'danger',
    label: i18n.translate('xpack.synthetics.errorGroups.pattern.persistent', {
      defaultMessage: 'Persistent',
    }),
  },
  intermittent: {
    color: 'warning',
    label: i18n.translate('xpack.synthetics.errorGroups.pattern.intermittent', {
      defaultMessage: 'Intermittent',
    }),
  },
  new: {
    color: 'accent',
    label: i18n.translate('xpack.synthetics.errorGroups.pattern.new', {
      defaultMessage: 'New',
    }),
  },
};

const PatternBadge = ({ pattern }: { pattern: ErrorGroupPattern }) => {
  const { color, label } = PATTERN_CONFIG[pattern];
  return <EuiBadge color={color}>{label}</EuiBadge>;
};

const ErrorGroupHistogram = ({ histogram }: { histogram: ErrorGroupHistogramBucket[] }) => {
  const {
    services: { charts },
  } = useKibana<ClientPluginsStart>();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const { euiTheme } = useEuiTheme();

  if (!histogram.length) return null;

  const data = histogram.map(({ timestamp, count }) => [timestamp, count]);
  const minInterval =
    histogram.length > 1 ? histogram[1].timestamp - histogram[0].timestamp : undefined;

  return (
    <div style={{ height: 120, width: '100%' }}>
      <Chart>
        <Settings
          xDomain={minInterval ? { min: NaN, max: NaN, minInterval } : undefined}
          locale={i18n.getLocale()}
          baseTheme={baseTheme}
        />
        <Tooltip />
        <Axis id="bottom" position={Position.Bottom} />
        <Axis id="left" position={Position.Left} ticks={3} />
        <BarSeries
          id="errorOccurrences"
          color={euiTheme.colors.danger}
          data={data}
          name={OCCURRENCES_LABEL}
          timeZone="local"
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </div>
  );
};

const ExpandedGroupRow = ({
  group,
  formatter,
  basePath,
  onPreview,
}: {
  group: ErrorGroup;
  formatter: (date: string) => string;
  basePath: string;
  onPreview: (item: ErrorGroupItem) => void;
}) => {
  const columns: Array<EuiBasicTableColumn<ErrorGroupItem>> = [
    {
      field: 'timestamp',
      name: TIMESTAMP_LABEL,
      sortable: true,
      render: (_value: string, item: ErrorGroupItem) => (
        <ErrorDetailsLink
          configId={item.configId}
          stateId={item.stateId}
          label={formatter(item.timestamp)}
          locationId={item.locationId}
        />
      ),
    },
    {
      field: 'monitorName',
      name: MONITOR_LABEL,
      render: (name: string, item: ErrorGroupItem) => (
        <EuiLink
          data-test-subj="syntheticsColumnsLink"
          href={`${basePath}/app/synthetics/monitor/${item.configId}`}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'locationName',
      name: LOCATION_LABEL,
      render: (value: string) => <EuiText size="s">{value || '--'}</EuiText>,
    },
    {
      field: 'durationMs',
      name: DURATION_LABEL,
      align: 'right',
      render: (value: number) => {
        if (!value || isNaN(value)) return <>{'--'}</>;
        if (value < 60000) return <EuiText size="s">{`${Math.round(value / 1000)}s`}</EuiText>;
        return <EuiText size="s">{`${Math.round(value / 60000)}m`}</EuiText>;
      },
    },
    {
      name: ACTIONS_LABEL,
      width: '40px',
      render: (item: ErrorGroupItem) => (
        <EuiToolTip content={PREVIEW_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={`syntheticsErrorPreview-${item.stateId}`}
            iconType="eye"
            aria-label={PREVIEW_LABEL}
            onClick={() => onPreview(item)}
            size="xs"
          />
        </EuiToolTip>
      ),
    },
  ];

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <ErrorGroupHistogram histogram={group.histogram} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiInMemoryTable
            tableCaption={i18n.translate('xpack.synthetics.errorGroups.tableCaption', {
              defaultMessage: 'Error groups',
            })}
            items={group.items}
            columns={columns}
            compressed
            pagination={group.items.length > 10 ? { pageSizeOptions: [10, 25] } : false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const ERROR_GROUPS_CAPTION = i18n.translate('xpack.synthetics.errorGroups.caption', {
  defaultMessage: 'Error groups list',
});

const ERROR_GROUP_LABEL = i18n.translate('xpack.synthetics.errorGroups.errorGroup', {
  defaultMessage: 'Error group',
});

const PATTERN_LABEL = i18n.translate('xpack.synthetics.errorGroups.pattern', {
  defaultMessage: 'Pattern',
});

const OCCURRENCES_LABEL = i18n.translate('xpack.synthetics.errorGroups.occurrences', {
  defaultMessage: 'Occurrences',
});

const MONITORS_LABEL = i18n.translate('xpack.synthetics.errorGroups.monitors', {
  defaultMessage: 'Monitors',
});

const LOCATIONS_LABEL = i18n.translate('xpack.synthetics.errorGroups.locations', {
  defaultMessage: 'Locations',
});

const FIRST_SEEN_LABEL = i18n.translate('xpack.synthetics.errorGroups.firstSeen', {
  defaultMessage: 'First seen',
});

const LAST_SEEN_LABEL = i18n.translate('xpack.synthetics.errorGroups.lastSeen', {
  defaultMessage: 'Last seen',
});

const EXPAND_LABEL = i18n.translate('xpack.synthetics.errorGroups.expand', {
  defaultMessage: 'Expand',
});

const COLLAPSE_LABEL = i18n.translate('xpack.synthetics.errorGroups.collapse', {
  defaultMessage: 'Collapse',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.errorGroups.timestamp', {
  defaultMessage: '@timestamp',
});

const MONITOR_LABEL = i18n.translate('xpack.synthetics.errorGroups.monitor', {
  defaultMessage: 'Monitor',
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.errorGroups.location', {
  defaultMessage: 'Location',
});

const DURATION_LABEL = i18n.translate('xpack.synthetics.errorGroups.duration', {
  defaultMessage: 'Duration',
});

const ACTIONS_LABEL = i18n.translate('xpack.synthetics.errorGroups.actions', {
  defaultMessage: 'Actions',
});

const PREVIEW_LABEL = i18n.translate('xpack.synthetics.errorGroups.preview', {
  defaultMessage: 'Quick preview',
});
