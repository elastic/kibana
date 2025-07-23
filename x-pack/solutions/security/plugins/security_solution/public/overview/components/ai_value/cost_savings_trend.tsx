/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import * as i18n from './translations';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { ChartHeight } from '../../../explore/components/stat_items/utils';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getCostSavingsTrendAreaLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/cost_savings_trend_area';

interface Props {
  from: string;
  to: string;
  attackAlertIds: string[];
}
const ID = 'CostSavingsTrendQuery';
const CostSavingsTrendComponent: React.FC<Props> = ({ attackAlertIds, from, to }) => {
  const extraVisualizationOptions = useMemo(
    () => ({
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              // only query alerts that are not part of an attack discovery
              must_not: attackAlertIds.map((uuid: string) => ({
                match_phrase: { 'kibana.alert.uuid': uuid },
              })),
            },
          },
        },
      ],
    }),
    [attackAlertIds]
  );

  return (
    <VisualizationEmbeddable
      data-test-subj="embeddable-area-chart"
      extraOptions={extraVisualizationOptions}
      getLensAttributes={getCostSavingsTrendAreaLensAttributes}
      timerange={{ from, to }}
      id={`${ID}-area-embeddable`}
      height={ChartHeight}
      width={'95%'}
      inspectTitle={i18n.COST_SAVINGS_TREND}
      scopeId={SourcererScopeName.detections}
      withActions={[
        VisualizationContextMenuActions.addToExistingCase,
        VisualizationContextMenuActions.addToNewCase,
        VisualizationContextMenuActions.inspect,
      ]}
    />
  );
};

export const CostSavingsTrend = React.memo(CostSavingsTrendComponent);
