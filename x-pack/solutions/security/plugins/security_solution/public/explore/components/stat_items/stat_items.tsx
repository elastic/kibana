/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiHorizontalRule, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';

import { StatItemHeader } from './stat_item_header';
import { useToggleStatus } from './use_toggle_status';
import type { StatItemsProps } from './types';
import { MetricEmbeddable } from './metric_embeddable';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { useStyles } from './stat_items.styles';

const CHART_HEIGHT = 120;

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

  const styles = useStyles();

  return (
    <EuiFlexItem css={styles.item} grow={1} data-test-subj={key}>
      <EuiPanel hasBorder>
        <StatItemHeader
          onToggle={onToggle}
          isToggleExpanded={isToggleExpanded}
          description={description}
        />

        {isToggleExpanded && (
          <>
            <MetricEmbeddable
              fields={fields}
              id={id}
              timerange={timerange}
              inspectTitle={description}
            />

            {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}
            <EuiFlexGroup gutterSize="none">
              {enableBarChart && (
                <EuiFlexItem css={styles.item}>
                  <VisualizationEmbeddable
                    data-test-subj="embeddable-bar-chart"
                    getLensAttributes={getBarChartLensAttributes}
                    timerange={timerange}
                    id={`${id}-bar-embeddable`}
                    height={CHART_HEIGHT}
                    inspectTitle={description}
                  />
                </EuiFlexItem>
              )}

              {enableAreaChart && from != null && to != null && (
                <>
                  <EuiFlexItem css={styles.item}>
                    <VisualizationEmbeddable
                      data-test-subj="embeddable-area-chart"
                      getLensAttributes={getAreaChartLensAttributes}
                      timerange={timerange}
                      id={`${id}-area-embeddable`}
                      height={CHART_HEIGHT}
                      inspectTitle={description}
                    />
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </EuiFlexItem>
  );
});

StatItemsComponent.displayName = 'StatItemsComponent';
