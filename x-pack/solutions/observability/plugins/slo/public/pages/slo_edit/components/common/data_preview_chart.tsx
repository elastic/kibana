/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  Axis,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipTable,
  TooltipTableColumn,
} from '@elastic/charts';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { GetPreviewDataResponse } from '@kbn/slo-schema';
import { map, max, min, values } from 'lodash';
import moment from 'moment';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useKibana } from '../../../../hooks/use_kibana';
import { useDebouncedGetPreviewData } from '../../hooks/use_preview';
import { useSectionFormValidation } from '../../hooks/use_section_form_validation';
import { CreateSLOForm } from '../../types';

interface DataPreviewChartProps {
  formatPattern?: string;
  threshold?: number;
  thresholdDirection?: 'above' | 'below';
  thresholdColor?: string;
  thresholdMessage?: string;
  ignoreMoreThan100?: boolean;
}

export function DataPreviewChart({
  formatPattern,
  // Specific to timeslice metric indicator type
  threshold,
  thresholdDirection,
  thresholdColor,
  thresholdMessage,
  ignoreMoreThan100,
}: DataPreviewChartProps) {
  const { watch, getFieldState, formState, getValues } = useFormContext<CreateSLOForm>();
  const { charts, uiSettings } = useKibana().services;
  const { isIndicatorSectionValid } = useSectionFormValidation({
    getFieldState,
    getValues,
    formState,
    watch,
  });

  const [range, _] = useState({
    from: moment().subtract(1, 'day').toDate(),
    to: new Date(),
  });

  const indicator = watch('indicator');
  const groupBy = watch('groupBy');

  const {
    data: previewData,
    isLoading,
    isSuccess,
    isError,
  } = useDebouncedGetPreviewData(isIndicatorSectionValid, indicator, range, groupBy);

  const isMoreThan100 =
    !ignoreMoreThan100 &&
    previewData?.results.some((datum) => datum.sliValue && datum.sliValue > 1);

  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const numberFormat =
    formatPattern != null
      ? formatPattern
      : (uiSettings.get('format:percent:defaultPattern') as string);

  const { maxValue, minValue, domain } = getChartDomain(previewData, threshold);

  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.slo.sloEdit.dataPreviewChart.panelLabel"
            defaultMessage="SLI preview"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );

  if (!isIndicatorSectionValid) {
    return (
      <EuiFlexItem>
        {title}
        <EuiFormRow fullWidth>
          <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight: 194 }}>
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 160 }}>
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.slo.sloEdit.dataPreviewChart.explanationMessage', {
                  defaultMessage:
                    'Fill the indicator fields to see visualisation of the current metrics',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  const annotation = threshold != null && (
    <>
      <LineAnnotation
        id="thresholdAnnotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[{ dataValue: threshold }]}
        style={{
          line: {
            strokeWidth: 2,
            stroke: thresholdColor ?? '#000',
            opacity: 1,
          },
        }}
      />
      <RectAnnotation
        dataValues={[
          {
            coordinates:
              thresholdDirection === 'above'
                ? { y0: threshold, y1: maxValue }
                : { y0: minValue, y1: threshold },
            details: thresholdMessage,
          },
        ]}
        id="thresholdShade"
        style={{ fill: thresholdColor ?? '#000', opacity: 0.1 }}
      />
    </>
  );

  const columns: TooltipTableColumn[] = [
    {
      id: 'color',
      type: 'color',
    },
    {
      id: 'group',
      type: 'custom',
      header: i18n.translate('xpack.slo.sloEdit.dataPreviewChart.tooltip.groupLabel', {
        defaultMessage: 'Group',
      }),
      truncate: true,
      cell: ({ label: cellLabel }) => <span className="echTooltip__label">{cellLabel}</span>,
      style: { textAlign: 'left' },
    },
    {
      id: 'sli',
      type: 'custom',
      header: i18n.translate('xpack.slo.sloEdit.dataPreviewChart.tooltip.sliLabel', {
        defaultMessage: 'SLI',
      }),
      cell: ({ formattedValue }) => (
        <span className="echTooltip__value" dir="ltr">
          {formattedValue}
        </span>
      ),
      style: { textAlign: 'right' },
    },
    {
      id: 'good',
      type: 'custom',
      header: i18n.translate('xpack.slo.sloEdit.dataPreviewChart.tooltip.goodEventsLabel', {
        defaultMessage: 'Good events',
      }),
      cell: ({ datum }) => (
        <span className="echTooltip__value" dir="ltr">
          {datum.events?.good ?? '-'}
        </span>
      ),
      style: { textAlign: 'right' },
    },
    {
      id: 'total',
      type: 'custom',
      header: i18n.translate('xpack.slo.sloEdit.dataPreviewChart.tooltip.totalEventsLabel', {
        defaultMessage: 'Total events',
      }),
      cell: ({ datum }) => (
        <span className="echTooltip__value" dir="ltr">
          {datum.events?.total ?? '-'}
        </span>
      ),
      style: { textAlign: 'right' },
    },
  ];

  return (
    <EuiFlexItem>
      {title}
      {isMoreThan100 && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.slo.sloEdit.dataPreviewChart.moreThan100', {
              defaultMessage:
                'Some of the SLI values are more than 100%. That means good query is returning more results than total query.',
            })}
            iconType="warning"
          />
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiFormRow fullWidth>
        <EuiPanel hasBorder={true} hasShadow={false} style={{ minHeight: 194 }}>
          {(isLoading || isError) && (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: 160 }}>
              <EuiFlexItem grow={false}>
                {isLoading && <EuiLoadingChart size="m" />}
                {isError && (
                  <span>
                    {i18n.translate('xpack.slo.sloEdit.dataPreviewChart.errorMessage', {
                      defaultMessage: 'The current indicator settings are invalid',
                    })}
                  </span>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {isSuccess && (
            <Chart size={{ height: 160, width: '100%' }}>
              <Tooltip
                type="vertical"
                body={({ items }) => {
                  return <TooltipTable columns={columns} items={items} />;
                }}
              />
              <Settings
                baseTheme={baseTheme}
                showLegend={true}
                legendPosition={Position.Right}
                theme={[{ lineSeriesStyle: { point: { visible: 'never' } } }]}
                locale={i18n.getLocale()}
              />

              {annotation}

              <Axis
                id="value"
                title={i18n.translate('xpack.slo.sloEdit.dataPreviewChart.yTitle', {
                  defaultMessage: 'SLI',
                })}
                ticks={5}
                position={Position.Left}
                tickFormat={(d) => numeral(d).format(numberFormat)}
                domain={domain}
              />
              <Axis
                id="time"
                title={i18n.translate('xpack.slo.sloEdit.dataPreviewChart.xTitle', {
                  defaultMessage: 'Last 24 hours',
                })}
                tickFormat={(d) => moment(d).format(dateFormat)}
                position={Position.Bottom}
                gridLine={{ visible: true }}
              />

              <LineSeries
                id="All groups"
                // Defaults to multi layer time axis as of Elastic Charts v70
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor="date"
                yAccessors={['value']}
                data={(previewData?.results ?? []).map((datum) => ({
                  date: new Date(datum.date).getTime(),
                  value: datum.sliValue && datum.sliValue >= 0 ? datum.sliValue : null,
                  events: datum.events,
                }))}
              />

              {map(previewData?.groups, (data, group) => (
                <LineSeries
                  key={group}
                  id={group}
                  // Defaults to multi layer time axis as of Elastic Charts v70
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="date"
                  yAccessors={['value']}
                  data={data.map((datum) => ({
                    date: new Date(datum.date).getTime(),
                    value: datum.sliValue && datum.sliValue >= 0 ? datum.sliValue : null,
                    events: datum.events,
                  }))}
                />
              ))}
            </Chart>
          )}
        </EuiPanel>
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function getChartDomain(previewData?: GetPreviewDataResponse, threshold?: number) {
  const allGroupsValues = map(previewData?.results, (datum) => datum.sliValue);
  const groupsValues = values(previewData?.groups)
    .flat()
    .map((datum) => datum.sliValue);
  const maxValue = max(allGroupsValues.concat(groupsValues));
  const minValue = min(allGroupsValues.concat(groupsValues));
  const domain = {
    fit: true,
    min: min([threshold, minValue]) ?? NaN,
    max: max([threshold, maxValue]) ?? NaN,
  };
  return { maxValue, minValue, domain };
}
