/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { ObservabilityDataViews } from '@kbn/exploratory-view-plugin/public';
import type { AnnotationLayerConfig } from '@kbn/exploratory-view-plugin/public';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../common/constants/synthetics_alerts';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useGetUrlParams } from '../../../hooks';
import { useMonitorFilters } from './use_monitor_filters';

// A single value's KQL clause, e.g. `field: ("a" or "b")`.
const kqlValuesClause = (field: string, values: Array<string | number>): string => {
  const quoted = values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`);
  return quoted.length === 1 ? `${field}: ${quoted[0]}` : `${field}: (${quoted.join(' or ')})`;
};

/**
 * Vertical markers for alert start times, drawn on top of the "Pings over
 * time" chart via a Lens query-driven annotation layer. This layer resolves
 * its own data view (the alerts-as-data index), independent of the chart's
 * `synthetics` data — see `AnnotationLayerConfig` in exploratory_view.
 */
export function useOverviewAlertsAnnotations(): AnnotationLayerConfig[] | undefined {
  const { dataViews } = useKibana<ClientPluginsStart>().services;
  const { euiTheme } = useEuiTheme();
  const { locations } = useGetUrlParams();
  const alertsFilters = useMonitorFilters({ forAlerts: true });

  const { data: alertsDataView } = useFetcher(async () => {
    return new ObservabilityDataViews(dataViews, true).getDataView('alerts');
  }, [dataViews]);

  const kqlClauses = useMemo(() => {
    const clauses = [
      kqlValuesClause('kibana.alert.rule.rule_type_id', [
        SYNTHETICS_STATUS_RULE,
        SYNTHETICS_TLS_RULE,
      ]),
      kqlValuesClause('kibana.alert.status', ['active', 'recovered']),
      ...alertsFilters.map((filter) => kqlValuesClause(filter.field, filter.values ?? [])),
      ...(locations?.length ? [kqlValuesClause('observer.geo.name', locations)] : []),
    ];
    return clauses.join(' and ');
  }, [alertsFilters, locations]);

  return useMemo(() => {
    if (!alertsDataView) {
      return undefined;
    }

    const annotation: QueryPointEventAnnotationConfig = {
      id: 'overview-alerts-annotation',
      type: 'query',
      key: { type: 'point_in_time' },
      filter: { type: 'kibana_query', query: kqlClauses, language: 'kuery' },
      timeField: '@timestamp',
      label: alertsAnnotationLabel,
      color: euiTheme.colors.accent,
      icon: 'alert',
    };

    return [{ dataView: alertsDataView, annotations: [annotation] }];
  }, [alertsDataView, kqlClauses, euiTheme.colors.accent]);
}

const alertsAnnotationLabel = i18n.translate(
  'xpack.synthetics.overview.activity.alertsAnnotationLabel',
  { defaultMessage: 'Alert' }
);
