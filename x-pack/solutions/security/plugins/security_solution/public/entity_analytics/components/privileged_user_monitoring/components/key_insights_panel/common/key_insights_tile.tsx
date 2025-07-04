/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReactElement } from 'react';
import { createKeyInsightsPanelLensAttributes } from './lens_attributes';
import { VisualizationEmbeddable } from '../../../../../../common/components/visualization_actions/visualization_embeddable';
import { useEsqlGlobalFilterQuery } from '../../../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { useVisualizationResponse } from '../../../../../../common/components/visualization_actions/use_visualization_response';

const LENS_VISUALIZATION_HEIGHT = 150;
const LENS_VISUALIZATION_MIN_WIDTH = 190;

interface KeyInsightsTileProps {
  title: ReactElement;
  label: ReactElement;
  getEsqlQuery: (namespace: string) => string;
  id: string;
  inspectTitle: ReactElement;
  spaceId?: string;
}

export const KeyInsightsTile: React.FC<KeyInsightsTileProps> = ({
  title,
  label,
  getEsqlQuery,
  id,
  inspectTitle,
  spaceId: propSpaceId,
}) => {
  const filterQuery = useEsqlGlobalFilterQuery();
  const timerange = useGlobalTime();
  const hookSpaceId = useSpaceId();

  // Use prop spaceId if provided, otherwise use hook spaceId, fallback to 'default'
  const effectiveSpaceId = propSpaceId || hookSpaceId || 'default';

  // Extract the defaultMessage from FormattedMessage elements
  const titleString = title.props.defaultMessage;
  const labelString = label.props.defaultMessage;

  const lensAttributes = createKeyInsightsPanelLensAttributes({
    title: titleString,
    label: labelString,
    esqlQuery: getEsqlQuery(effectiveSpaceId),
    dataViewId: 'default-dataview',
    filterQuery,
  });

  const visualizationResponse = useVisualizationResponse({
    visualizationId: id,
  });

  // Track whether loading has started at least once
  const [hasStartedLoading, setHasStartedLoading] = useState(false);

  useEffect(() => {
    if (visualizationResponse?.loading === true) {
      setHasStartedLoading(true);
    }
  }, [visualizationResponse?.loading]);

  // Reset hasStartedLoading when any filter changes to allow fresh error detection
  useEffect(() => {
    setHasStartedLoading(false);
  }, [timerange.from, timerange.to, filterQuery, effectiveSpaceId]);

  // Only show error state if:
  // 1. Loading has started at least once (hasStartedLoading)
  // 2. Loading is now complete (loading === false)
  // 3. We have no tables (indicating an error)
  if (
    hasStartedLoading &&
    visualizationResponse &&
    visualizationResponse.loading === false &&
    !visualizationResponse.tables
  ) {
    return (
      <EuiFlexItem grow={false} style={{ minWidth: LENS_VISUALIZATION_MIN_WIDTH }}>
        <EuiPanel
          color="subdued"
          hasBorder={true}
          paddingSize="m"
          style={{ height: LENS_VISUALIZATION_HEIGHT }}
          data-test-subj="visualization-embeddable-error"
        >
          <EuiFlexGroup direction="column" justifyContent="flexStart" style={{ height: '100%' }}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexStart">
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <strong>{titleString}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={true} />
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.securitySolution.keyInsightsTile.dataNotAvailable"
                    defaultMessage="Data not available"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    );
  }

  // If we reach here, either still loading or we have a valid response, so show the embeddable
  return (
    <VisualizationEmbeddable
      applyGlobalQueriesAndFilters={true}
      applyPageAndTabsFilters={true}
      lensAttributes={lensAttributes}
      id={id}
      timerange={timerange}
      width={LENS_VISUALIZATION_MIN_WIDTH}
      height={LENS_VISUALIZATION_HEIGHT}
      disableOnClickFilter
      inspectTitle={inspectTitle}
    />
  );
};
