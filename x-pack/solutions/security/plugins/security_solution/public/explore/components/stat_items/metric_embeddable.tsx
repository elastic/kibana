/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React from 'react';
import { PageScope } from '../../../data_view_manager/constants';
import { FlexItem, StatValue } from './utils';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import type { FieldConfigs } from './types';

export interface MetricEmbeddableProps {
  fields: FieldConfigs[];
  id: string;
  inspectTitle?: string;
  timerange: { from: string; to: string };
}

const CHART_HEIGHT = 36;

const MetricEmbeddableComponent = ({
  fields,
  id,
  inspectTitle,
  timerange,
}: MetricEmbeddableProps) => (
  <EuiFlexGroup gutterSize="none" className="metricEmbeddable">
    {fields.map((field) => (
      <FlexItem key={`stat-items-field-${field.key}`}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          {field.icon && (
            <FlexItem grow={false}>
              <EuiIcon type={field.icon} color={field.color} size="l" data-test-subj="stat-icon" />
            </FlexItem>
          )}

          <EuiFlexItem>
            {field.lensAttributes && (
              <div data-test-subj="stat-title">
                <VisualizationEmbeddable
                  data-test-subj="embeddable-metric"
                  height={CHART_HEIGHT}
                  id={`${id}-${field.key}-metric-embeddable`}
                  lensAttributes={field.lensAttributes}
                  timerange={timerange}
                  inspectTitle={inspectTitle}
                  scopeId={PageScope.explore}
                />
              </div>
            )}
          </EuiFlexItem>
          {field.description != null && (
            <FlexItem>
              <StatValue>
                <p data-test-subj="stat-title">{field.description}</p>
              </StatValue>
            </FlexItem>
          )}
        </EuiFlexGroup>
      </FlexItem>
    ))}
  </EuiFlexGroup>
);

export const MetricEmbeddable = React.memo(MetricEmbeddableComponent);
