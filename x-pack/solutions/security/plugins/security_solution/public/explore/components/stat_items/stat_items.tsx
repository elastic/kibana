/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';

import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';

import { StatItemHeader } from './stat_item_header';
import { useToggleStatus } from './use_toggle_status';
import type { StatItemsProps } from './types';
import { ChartHeight, FlexItem } from './utils';
import { MetricEmbeddable } from './metric_embeddable';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { PageScope } from '../../../data_view_manager/constants';

export const StatItemsComponent = React.memo<StatItemsProps>(({ statItems, from, id, to }) => {
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );
  const {
    key,
    description,
    enableAreaChart,
    enableBarChart,
    fields,
    getBarChartLensAttributes,
    getAreaChartLensAttributes,
  } = statItems;

  const { isToggleExpanded, onToggle } = useToggleStatus({ id });
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const spaceId = useSpaceId();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false) === true;

  const kpiLensExtraOptions = useMemo(
    () => (entityStoreV2Enabled ? { entityStoreV2Enabled: true, spaceId } : undefined),
    [entityStoreV2Enabled, spaceId]
  );

  return (
    <FlexItem grow={1} data-test-subj={key}>
      <EuiPanel hasBorder>
        <StatItemHeader
          onToggle={onToggle}
          isToggleExpanded={isToggleExpanded}
          description={description}
        />

        {isToggleExpanded && (
          <>
            <MetricEmbeddable
              extraOptions={kpiLensExtraOptions}
              fields={fields}
              id={id}
              timerange={timerange}
              inspectTitle={description}
            />

            {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}
            <EuiFlexGroup gutterSize="none">
              {enableBarChart && (
                <FlexItem>
                  <VisualizationEmbeddable
                    data-test-subj="embeddable-bar-chart"
                    getLensAttributes={getBarChartLensAttributes}
                    timerange={timerange}
                    id={`${id}-bar-embeddable`}
                    height={ChartHeight}
                    inspectTitle={description}
                    scopeId={newDataViewPickerEnabled ? PageScope.explore : PageScope.default}
                  />
                </FlexItem>
              )}

              {enableAreaChart && from != null && to != null && (
                <>
                  <FlexItem>
                    <VisualizationEmbeddable
                      data-test-subj="embeddable-area-chart"
                      extraOptions={kpiLensExtraOptions}
                      getLensAttributes={getAreaChartLensAttributes}
                      timerange={timerange}
                      id={`${id}-area-embeddable`}
                      height={ChartHeight}
                      inspectTitle={description}
                      scopeId={newDataViewPickerEnabled ? PageScope.explore : PageScope.default}
                    />
                  </FlexItem>
                </>
              )}
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </FlexItem>
  );
});

StatItemsComponent.displayName = 'StatItemsComponent';
