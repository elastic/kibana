/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase } from '@kbn/es-query';
import { PageScope } from '../../../../data_view_manager/constants';
import * as i18n from './translations';
import { isNoisy } from './helpers';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';

import type { TimeframePreviewOptions } from '../../../common/types';
import { getRulePreviewLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/rule_preview';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';
import { INSPECT_ACTION } from '../../../../common/components/visualization_actions/use_actions';
import { RulePreviewAlertsTable } from './rule_preview_alerts_table';

export const ID = 'previewHistogram';

const CHART_HEIGHT = 150;

interface PreviewHistogramProps {
  previewId: string;
  addNoiseWarning: () => void;
  spaceId: string;
  ruleType: Type;
  indexPattern: DataViewBase | undefined;
  timeframeOptions: TimeframePreviewOptions;
}

const DEFAULT_HISTOGRAM_HEIGHT = 300;

const PreviewHistogramComponent = ({
  previewId,
  addNoiseWarning,
  spaceId,
  ruleType,
  indexPattern,
  timeframeOptions,
}: PreviewHistogramProps) => {
  const startDate = useMemo(
    () => timeframeOptions.timeframeStart.toISOString(),
    [timeframeOptions]
  );
  const endDate = useMemo(() => timeframeOptions.timeframeEnd.toISOString(), [timeframeOptions]);
  const isEqlRule = useMemo(() => ruleType === 'eql', [ruleType]);
  const isMlRule = useMemo(() => ruleType === 'machine_learning', [ruleType]);

  const timerange = useMemo(() => ({ from: startDate, to: endDate }), [startDate, endDate]);

  const extraVisualizationOptions = useMemo(
    () => ({
      ruleId: previewId,
      spaceId,
      showLegend: !isEqlRule,
    }),
    [isEqlRule, previewId, spaceId]
  );

  const previousPreviewId = usePrevious(previewId);
  const previewQueryId = `${ID}-${previewId}`;
  const previewEmbeddableId = `${previewQueryId}-embeddable`;
  const { tables } = useVisualizationResponse({
    visualizationId: previewEmbeddableId,
  });

  const totalCount = (tables && tables.meta.statistics.totalCount) ?? 0;

  useEffect(() => {
    if (previousPreviewId !== previewId && totalCount > 0) {
      if (isNoisy(totalCount, timeframeOptions)) {
        addNoiseWarning();
      }
    }
  }, [addNoiseWarning, previewId, previousPreviewId, timeframeOptions, totalCount]);

  return (
    <>
      <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'preview-histogram-panel'}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection
              id={previewQueryId}
              title={i18n.QUERY_GRAPH_HITS_TITLE}
              titleSize="xs"
              showInspectButton={false}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <VisualizationEmbeddable
              applyGlobalQueriesAndFilters={false}
              disableOnClickFilter={true}
              enableLegendActions={false}
              extraOptions={extraVisualizationOptions}
              getLensAttributes={getRulePreviewLensAttributes}
              height={CHART_HEIGHT}
              id={previewEmbeddableId}
              inspectTitle={i18n.QUERY_GRAPH_HITS_TITLE}
              scopeId={PageScope.alerts}
              stackByField={ruleType === 'machine_learning' ? 'host.name' : 'event.category'}
              timerange={timerange}
              withActions={INSPECT_ACTION}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>
                  {isMlRule
                    ? i18n.ML_PREVIEW_HISTOGRAM_DISCLAIMER
                    : i18n.PREVIEW_HISTOGRAM_DISCLAIMER}
                </p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
      <EuiSpacer />
      <RulePreviewAlertsTable
        previewId={previewId}
        spaceId={spaceId}
        indexPattern={indexPattern}
        timeframeOptions={timeframeOptions}
      />
    </>
  );
};

export const PreviewHistogram = React.memo(PreviewHistogramComponent);
PreviewHistogram.displayName = 'PreviewHistogram';
