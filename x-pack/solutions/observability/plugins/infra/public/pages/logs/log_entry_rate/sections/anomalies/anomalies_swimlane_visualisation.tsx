/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo } from 'react';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '@kbn/ml-plugin/public';
import { MissingEmbeddableFactoryCallout } from '../../../../../components/missing_embeddable_factory_callout';
import { partitionField } from '../../../../../../common/infra_ml';
import { TimeRange } from '../../../../../../common/time/time_range';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { AutoRefresh } from '../../use_log_entry_rate_results_url_state';

interface Props {
  timeRange: TimeRange;
  jobIds: string[];
  selectedDatasets: string[];
  autoRefresh: AutoRefresh;
}

// Disable refresh, allow our timerange changes to refresh the embeddable.
const REFRESH_CONFIG = {
  pause: true,
  value: 0,
};

export const AnomaliesSwimlaneVisualisation: React.FC<Props> = (props) => {
  const { embeddable: embeddablePlugin } = useKibanaContextForPlugin().services;
  if (!embeddablePlugin) return null;
  return <VisualisationContent {...props} />;
};

export const VisualisationContent: React.FC<Props> = ({ timeRange, jobIds, selectedDatasets }) => {
  const { ml } = useKibanaContextForPlugin().services;

  const formattedTimeRange = useMemo(() => {
    return {
      from: moment(timeRange.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      to: moment(timeRange.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
    };
  }, [timeRange.startTime, timeRange.endTime]);

  const query = useMemo(() => {
    return {
      language: 'kuery',
      query: selectedDatasets
        .map((dataset) => `${partitionField} : ${dataset !== '' ? dataset : '""'}`)
        .join(' or '), // Ensure unknown (those with an empty "" string) datasets are handled correctly.
    };
  }, [selectedDatasets]);

  const AnomalySwimLane = ml?.components.AnomalySwimLane;
  if (!AnomalySwimLane) {
    return <MissingEmbeddableFactoryCallout embeddableType={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE} />;
  }

  return (
    <AnomalySwimLane
      id="LOG_ENTRY_ANOMALIES_EMBEDDABLE_INSTANCE"
      executionContext={{ name: 'infra_logs' }}
      jobIds={jobIds}
      swimlaneType="viewBy"
      viewBy={partitionField}
      refreshConfig={REFRESH_CONFIG}
      timeRange={formattedTimeRange}
      query={query}
    />
  );
};
