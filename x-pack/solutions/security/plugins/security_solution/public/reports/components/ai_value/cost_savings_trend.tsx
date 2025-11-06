/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useSignalIndexWithDefault } from '../../hooks/use_signal_index_with_default';
import * as i18n from './translations';
import type {
  EmbeddableData,
  GetLensAttributes,
  VisualizationTablesWithMeta,
} from '../../../common/components/visualization_actions/types';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getCostSavingsTrendAreaLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/cost_savings_trend_area';
import { CostSavingsKeyInsight } from './cost_savings_key_insight';

interface Props {
  from: string;
  isLoading: boolean;
  to: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
}
const ID = 'CostSavingsTrendQuery';

/**
 * Renders a Lens embeddable area chart visualization showing the estimated cost savings trend
 * over time, based on the number of AI filtered alerts, minutes saved per alert, and analyst hourly rate
 * for a given time range.
 */

const CostSavingsTrendComponent: React.FC<Props> = ({
  minutesPerAlert,
  analystHourlyRate,
  isLoading,
  from,
  to,
}) => {
  const timerange = useMemo(() => ({ from, to }), [from, to]);
  const signalIndexName = useSignalIndexWithDefault();
  const getLensAttributes = useCallback<GetLensAttributes>(
    (args) =>
      getCostSavingsTrendAreaLensAttributes({
        ...args,
        minutesPerAlert,
        analystHourlyRate,
        signalIndexName,
      }),
    [analystHourlyRate, minutesPerAlert, signalIndexName]
  );
  const isSmall = useIsWithinMaxBreakpoint('s');
  const {
    euiTheme: { size },
  } = useEuiTheme();

  const [lensResponse, setLensResponse] = useState<VisualizationTablesWithMeta | null>(null);

  const handleEmbeddableLoad = useCallback((data: EmbeddableData) => {
    if (data?.tables) {
      setLensResponse(data.tables);
    }
  }, []);
  useEffect(() => {
    // when timerange changes, reset lens response
    setLensResponse(null);
  }, [timerange]);

  return (
    <div
      css={css`
        padding: ${size.base} ${size.xl};
        .euiPanel,
        .embPanel,
        .echMetric,
        .echChartBackground,
        .embPanel__hoverActions > span {
          background-color: rgb(0, 0, 0, 0) !important;
        }
      `}
      data-test-subj="cost-savings-trend-panel"
    >
      <EuiTitle size="m">
        <h2>{i18n.COST_SAVINGS_TREND}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup
        gutterSize="xl"
        css={css`
          gap: 48px;
        `}
      >
        <EuiFlexItem>
          <VisualizationEmbeddable
            data-test-subj="embeddable-area-chart"
            getLensAttributes={getLensAttributes}
            timerange={timerange}
            onLoad={handleEmbeddableLoad}
            id={`${ID}-area-embeddable`}
            height={300}
            inspectTitle={i18n.COST_SAVINGS_TREND}
            scopeId={SourcererScopeName.detections}
            withActions={[
              VisualizationContextMenuActions.addToExistingCase,
              VisualizationContextMenuActions.addToNewCase,
              VisualizationContextMenuActions.inspect,
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            max-width: ${isSmall ? 'auto' : '600px'};
          `}
        >
          <CostSavingsKeyInsight isLoading={isLoading} lensResponse={lensResponse} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export const CostSavingsTrend = React.memo(CostSavingsTrendComponent);
