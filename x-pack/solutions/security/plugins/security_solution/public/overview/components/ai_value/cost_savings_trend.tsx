/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SourcererScopeName } from '../../../sourcerer/store/model';
import { ChartHeight } from '../../../explore/components/stat_items/utils';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getCostSavingsTrendAreaLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/cost_savings_trend_area';

interface Props {
  from: string;
  to: string;
}
const ID = 'CostSavingsTrendQuery';
const CostSavingsTrendComponent: React.FC<Props> = ({ from, to }) => {
  // const { euiTheme } = useEuiTheme();
  return (
    <VisualizationEmbeddable
      data-test-subj="embeddable-area-chart"
      getLensAttributes={getCostSavingsTrendAreaLensAttributes}
      timerange={{ from, to }}
      id={`${ID}-area-embeddable`}
      height={ChartHeight}
      inspectTitle={'Trend'}
      scopeId={SourcererScopeName.detections}
    />
  );
};

export const CostSavingsTrend = React.memo(CostSavingsTrendComponent);
