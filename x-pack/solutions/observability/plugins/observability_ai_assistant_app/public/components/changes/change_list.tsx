/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiThemeComputed,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { ChangePointType } from '@kbn/es-types/src';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import momentTz from 'moment-timezone';
import { IUiSettingsClient } from '@kbn/core/public';
import { DATE_FORMAT_ID } from '@kbn/management-settings-ids';
import { useTheme } from '../../hooks/use_theme';
import { SparkPlot } from '../charts/spark_plot';
import { useKibana } from '../../hooks/use_kibana';

export enum ChangeListItemImpact {
  low = 1,
  medium = 2,
  high = 3,
}

export interface ChangeListItem {
  label: React.ReactNode;
  change?: {
    impact: ChangeListItemImpact;
    time: number;
    type: ChangePointType;
  };
  timeseries: Array<{ x: number; y: number | null }>;
}

function getFormattedTimestamp({ format, time }: { format: string; time: number }) {
  return momentTz(time).format(format);
}

export interface ChangeListProps {
  title: string;
  items: ChangeListItem[];
}

function getImpactProperties({
  impact,
  theme,
}: {
  impact: ChangeListItemImpact;
  theme: EuiThemeComputed;
}) {
  if (impact === ChangeListItemImpact.high) {
    return {
      color: theme.colors.danger,
      label: i18n.translate('xpack.observabilityAiAssistant.changesList.dotImpactHigh', {
        defaultMessage: 'High',
      }),
    };
  }

  if (impact === ChangeListItemImpact.medium) {
    return {
      color: theme.colors.warning,
      label: i18n.translate('xpack.observabilityAiAssistant.changesList.dotImpactMedium', {
        defaultMessage: 'Medium',
      }),
    };
  }

  return {
    color: theme.colors.darkShade,
    label: i18n.translate('xpack.observabilityAiAssistant.changesList.dotImpactLow', {
      defaultMessage: 'Low',
    }),
  };
}

function getColumns({
  theme,
  uiSettings,
}: {
  theme: EuiThemeComputed;
  uiSettings: IUiSettingsClient;
}) {
  const format = uiSettings.get<string>(DATE_FORMAT_ID);

  const columns: Array<EuiBasicTableColumn<ChangeListItem>> = [
    {
      name: '',
      field: 'change',
      render: (_, { change }) => {
        if (!change) {
          return (
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                white-space: nowrap;
              `}
            >
              {i18n.translate('xpack.observabilityAiAssistant.changesList.noChangesDetected', {
                defaultMessage: 'No changes detected',
              })}
            </EuiText>
          );
        }

        const { label, color } = getImpactProperties({ theme, impact: change.impact });

        return (
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            css={css`
              white-space: nowrap;
            `}
            justifyContent="center"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="dot" color={color} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">{label}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{change.type}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {getFormattedTimestamp({
                  format,
                  time: change.time,
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.observabilityAiAssistant.changesList.trendColumnTitle', {
        defaultMessage: 'Trend',
      }),
      sortable: false,
      field: 'timeseries',
      render: (_, { timeseries, change }) => {
        return (
          <SparkPlot
            timeseries={timeseries}
            type="bar"
            annotations={
              change
                ? [
                    {
                      id: '',
                      x: change.time,
                      label: getFormattedTimestamp({
                        format,
                        time: change.time,
                      }),
                      color: getImpactProperties({ impact: change.impact, theme }).color,
                      icon: <EuiIcon type="dot" />,
                    },
                  ]
                : []
            }
          />
        );
      },
    },
    {
      name: i18n.translate('xpack.observabilityAiAssistant.changesList.labelColumnTitle', {
        defaultMessage: 'Label',
      }),
      width: '100%',
      field: 'label',
      render: (_, { label }) => {
        return (
          <EuiToolTip content={label}>
            <EuiText
              size="xs"
              css={css`
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {label}
            </EuiText>
          </EuiToolTip>
        );
      },
    },
  ];

  return columns;
}

export function ChangeList({ title, items }: ChangeListProps) {
  const theme = useTheme();

  const {
    services: { uiSettings },
  } = useKibana();

  const columns = useMemo(() => {
    return getColumns({ theme, uiSettings });
  }, [theme, uiSettings]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable items={items} columns={columns} tableLayout="auto" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
