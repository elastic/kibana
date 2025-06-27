/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EnrichedEntityDefinitionsResponse } from '@kbn/observability-navigation-plugin/public';
import type { LensPublicCallbacks } from '@kbn/lens-plugin/public/react_embeddable/types';
import type { InfraDashboardLocatorParams } from '@kbn/observability-shared-plugin/common';
import { INFRA_DASHBOARD_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { LensWrapper } from '../../../../../components/lens/lens_wrapper';
import type { UseLensAttributesParams } from '../../../../../hooks/use_lens_attributes';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { useDatePickerContext } from '../../hooks/use_date_picker';

const getLensAttributesParams = (
  entityDefinition: EnrichedEntityDefinitionsResponse
): UseLensAttributesParams => {
  const stats = entityDefinition.metrics
    .filter((metric) => metric.instrument === 'gauge' || metric.instrument === 'updowncounter')
    .map((metric) => {
      return `${metric.metricName} = max(${metric.metricName}::double)`;
    })
    .join(', ');

  const where = entityDefinition.attributes
    .map((attribute) => {
      return `${attribute} IS NOT NULL`;
    })
    .join(' AND ');

  const keep = entityDefinition.attributes
    .map((attribute) => {
      return attribute;
    })
    .join(', ');

  const query = `FROM metrics-* | WHERE ${where} | LIMIT 1000 | STATS ${stats} BY ${keep}`;

  return {
    chartType: 'table',
    dataset: {
      esql: query,
    },
    title: entityDefinition.name,
    metrics: entityDefinition.metrics
      .filter((metric) => metric.instrument === 'gauge')
      .map((metric) => ({
        value: metric.metricName,
        format: metric.unit === 'By' ? 'bytes' : metric.unit === 's' ? 'duration' : undefined,
      })),
    rows: entityDefinition.attributes.map((attribute) => ({
      field: attribute,
      oneClickFilter: !!entityDefinition.navigation?.href,
    })),
  };
};
export const EntityTableContent = ({
  entityDefinition,
}: {
  entityDefinition: EnrichedEntityDefinitionsResponse;
}) => {
  const { services } = useKibanaContextForPlugin();
  const { dateRange } = useDatePickerContext();
  const { from, to } = dateRange;

  const locator = services.share.url.locators.get<InfraDashboardLocatorParams>(
    INFRA_DASHBOARD_LOCATOR_ID
  );

  const params = useMemo(() => getLensAttributesParams(entityDefinition), [entityDefinition]);

  const { attributes } = useLensAttributes(params);

  const onFilter = useCallback(
    (filterData: Parameters<NonNullable<LensPublicCallbacks['onFilter']>>[0]) => {
      const { data } = filterData;
      const tableData = data[0];
      if ('column' in tableData) {
        const { column, value } = tableData;

        // hack because the order of columns in the data table doesn't match with `column` index
        const columns = attributes?.state.datasourceStates.textBased?.layers.layer_0.columns ?? [];

        locator?.navigate({
          relativePath: entityDefinition.navigation?.href ?? '',
          kuery: `${columns[column].fieldName} : "${value}"`,
        });
      }
    },
    [
      attributes?.state.datasourceStates.textBased?.layers,
      locator,
      entityDefinition.navigation?.href,
    ]
  );

  return (
    <div>
      <LensWrapper
        attributes={attributes}
        dateRange={{ from, to }}
        loading={!attributes}
        onFilter={onFilter}
      />
    </div>
  );
};
