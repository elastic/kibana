/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { EpisodesFilterState } from '@kbn/alerting-v2-common-queries';
import { createObservabilityAlertingV2Host } from '@kbn/deeplinks-observability';
import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { EpisodesHistogram } from '@kbn/alerting-v2-episodes-ui/components/episodes_histogram';
import type { EpisodesHistogramServices } from '@kbn/alerting-v2-episodes-ui/components/episodes_histogram';
import { EpisodesKpis } from '@kbn/alerting-v2-episodes-ui/components/episodes_kpis';
import type { EpisodesKpisServices } from '@kbn/alerting-v2-episodes-ui/components/episodes_kpis';
import { EpisodesTable } from '@kbn/alerting-v2-episodes-ui/components/episodes_table';
import type { EpisodesTableServices } from '@kbn/alerting-v2-episodes-ui/components/episodes_table';
import { useAlertingEpisodesDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { useKibana as useObservabilityKibana } from '../../../../../utils/kibana_react';

const OVERVIEW_FILTER_STATE: EpisodesFilterState = {};

const TABLE_MIN_HEIGHT = 200;
const TABLE_MAX_HEIGHT = 400;

type EmbeddedAlertsServices = EpisodesHistogramServices &
  EpisodesKpisServices &
  EpisodesTableServices;

function UniversalAlertsSectionContent({
  timeRange,
  onTimeRangeChange,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (next: TimeRange) => void;
}) {
  const services = useKibana<EmbeddedAlertsServices>().services;
  const dataView = useAlertingEpisodesDataView({ services });
  const [breakdownField, setBreakdownField] = useState<string | undefined>();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EpisodesKpis
          services={services}
          filterState={OVERVIEW_FILTER_STATE}
          timeRange={timeRange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EpisodesHistogram
          services={services}
          dataView={dataView}
          filterState={OVERVIEW_FILTER_STATE}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          breakdownField={breakdownField}
          onBreakdownFieldChange={setBreakdownField}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EpisodesTable
          services={services}
          filterState={OVERVIEW_FILTER_STATE}
          timeRange={timeRange}
          minHeight={TABLE_MIN_HEIGHT}
          maxHeight={TABLE_MAX_HEIGHT}
          showLimitedResultsNotice={false}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function UniversalAlertsSection({ alertingVTwo }: { alertingVTwo: AlertingV2PublicStart }) {
  const { relativeStart, relativeEnd, updateTimeRange } = useDatePickerContext();
  const coreStart = useObservabilityKibana().services;

  const hostApp = useMemo(
    () => createObservabilityAlertingV2Host(alertingVTwo.createAlertingV2HostApp),
    [alertingVTwo]
  );

  const timeRange = useMemo(
    () => ({ from: relativeStart, to: relativeEnd }),
    [relativeStart, relativeEnd]
  );

  const onTimeRangeChange = useCallback(
    (next: TimeRange) => updateTimeRange({ start: next.from, end: next.to }),
    [updateTimeRange]
  );

  const { AlertsProvider } = alertingVTwo;

  return (
    <AlertsProvider coreStart={coreStart} hostApp={hostApp}>
      <UniversalAlertsSectionContent timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />
    </AlertsProvider>
  );
}

// eslint-disable-next-line import/no-default-export
export default UniversalAlertsSection;
