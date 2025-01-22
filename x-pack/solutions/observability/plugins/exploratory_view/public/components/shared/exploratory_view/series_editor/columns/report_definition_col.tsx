/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesConfig, SeriesUrl } from '../../types';
import { ReportDefinitionField } from './report_definition_field';
import { TextReportDefinitionField } from './text_report_definition_field';
import { isStepLevelMetric } from '../../configurations/synthetics/kpi_over_time_config';
import { SYNTHETICS_STEP_NAME } from '../../configurations/constants/field_names/synthetics';

export function ReportDefinitionCol({
  seriesId,
  series,
  seriesConfig,
}: {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}) {
  const { setSeries } = useSeriesStorage();

  const {
    reportDefinitions: selectedReportDefinitions = {},
    textReportDefinitions: selectedTextReportDefinitions = {},
  } = series;

  const { definitionFields, textDefinitionFields } = seriesConfig;

  const onChange = (field: string, value?: string[]) => {
    if (!value?.[0]) {
      delete selectedReportDefinitions[field];
      setSeries(seriesId, {
        ...series,
        reportDefinitions: { ...selectedReportDefinitions },
      });
    } else {
      setSeries(seriesId, {
        ...series,
        reportDefinitions: { ...selectedReportDefinitions, [field]: value },
      });
    }
  };

  const onChangeTextDefinitionField = (field: string, value: string) => {
    if (isEmpty(value)) {
      delete selectedTextReportDefinitions[field];
      setSeries(seriesId, {
        ...series,
        textReportDefinitions: { ...selectedTextReportDefinitions },
      });
    } else {
      setSeries(seriesId, {
        ...series,
        textReportDefinitions: { ...selectedTextReportDefinitions, [field]: value },
      });
    }
  };

  const hasFieldDataSelected = (field: string) => {
    return !isEmpty(series.reportDefinitions?.[field]);
  };

  return (
    <EuiFlexGroup gutterSize="s">
      {definitionFields.map((field) => {
        const fieldStr = typeof field === 'string' ? field : field.field;
        const singleSelection = typeof field !== 'string' && field.singleSelection;
        const nestedField = typeof field !== 'string' && field.nested;
        const filters = typeof field !== 'string' ? field.filters : undefined;

        const isNonStepMetric = !isStepLevelMetric(series.selectedMetricField);

        const hideNestedStep = nestedField === SYNTHETICS_STEP_NAME && isNonStepMetric;

        if (hideNestedStep && nestedField && selectedReportDefinitions[nestedField]?.length > 0) {
          setSeries(seriesId, {
            ...series,
            reportDefinitions: { ...selectedReportDefinitions, [nestedField]: [] },
          });
        }

        let nestedFieldElement;

        if (nestedField && hasFieldDataSelected(fieldStr) && !hideNestedStep) {
          nestedFieldElement = (
            <EuiFlexItem key={nestedField} grow={1}>
              <ReportDefinitionField
                seriesId={seriesId}
                series={series}
                seriesConfig={seriesConfig}
                field={nestedField}
                onChange={onChange}
                keepHistory={false}
                singleSelection={singleSelection}
              />
            </EuiFlexItem>
          );
        }

        return (
          <>
            <EuiFlexItem key={fieldStr} grow={1}>
              <ReportDefinitionField
                seriesId={seriesId}
                series={series}
                seriesConfig={seriesConfig}
                field={fieldStr}
                onChange={onChange}
                singleSelection={singleSelection}
                filters={filters}
              />
            </EuiFlexItem>
            {nestedFieldElement}
          </>
        );
      })}

      {textDefinitionFields?.map((field) => {
        return (
          <EuiFlexItem key={field} grow={1}>
            <TextReportDefinitionField
              seriesId={seriesId}
              series={series}
              seriesConfig={seriesConfig}
              field={field}
              onChange={onChangeTextDefinitionField}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
