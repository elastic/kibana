/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactElement } from 'react';
import { createKeyInsightsPanelLensAttributes } from './lens_attributes';
import { VisualizationEmbeddable } from '../../../../../../common/components/visualization_actions/visualization_embeddable';
import { useEsqlGlobalFilterQuery } from '../../../../../../common/hooks/esql/use_esql_global_filter';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';

const LENS_VISUALIZATION_HEIGHT = 126;
const LENS_VISUALIZATION_MIN_WIDTH = 160;

interface KeyInsightsTileProps {
  /** The title of the tile (i18n FormattedMessage element) */
  title: ReactElement;
  /** The label for the visualization (i18n FormattedMessage element) */
  label: ReactElement;
  /** Function that returns the ESQL query for the given namespace */
  getEsqlQuery: (namespace: string) => string;
  /** Unique ID for the visualization */
  id: string;
  /** The inspect title element for the visualization */
  inspectTitle: ReactElement;
  /** Optional override for space ID (if not provided, will use useSpaceId hook) */
  spaceId?: string;
  /** Optional flag to force showing N/A state for testing */
  showNAState?: boolean;
}

export const KeyInsightsTile: React.FC<KeyInsightsTileProps> = ({
  title,
  label,
  getEsqlQuery,
  id,
  inspectTitle,
  spaceId: propSpaceId,
  showNAState = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const filterQuery = useEsqlGlobalFilterQuery();
  const timerange = useGlobalTime();
  const hookSpaceId = useSpaceId();
  const [isDataUnavailable, setIsDataUnavailable] = useState(showNAState);

  // Use prop spaceId if provided, otherwise use hook spaceId, fallback to 'default'
  const effectiveSpaceId = propSpaceId || hookSpaceId || 'default';

  // Extract the defaultMessage from FormattedMessage elements
  const titleString = title.props.defaultMessage;
  const labelString = label.props.defaultMessage;

  // Check if data is available by testing the query
  useEffect(() => {
    if (showNAState) {
      setIsDataUnavailable(true);
      return;
    }

    try {
      const query = getEsqlQuery(effectiveSpaceId);
      // Basic validation - if query is empty or contains only whitespace
      if (!query || query.trim().length === 0) {
        setIsDataUnavailable(true);
        return;
      }

      // Check for common error patterns in queries
      if (query.includes('ERROR') || query.includes('INVALID')) {
        setIsDataUnavailable(true);
        return;
      }

      setIsDataUnavailable(false);
    } catch (error) {
      setIsDataUnavailable(true);
    }
  }, [getEsqlQuery, effectiveSpaceId, showNAState]);

  // Show N/A state when data is unavailable
  if (isDataUnavailable) {
    return (
      <EuiFlexItem grow={false}>
        <div
          css={css`
            height: ${LENS_VISUALIZATION_HEIGHT}px;
            min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
            width: auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: ${euiTheme.colors.lightestShade};
            border-radius: ${euiTheme.border.radius.medium};
            padding: ${euiTheme.size.m};
            text-align: center;
          `}
          data-test-subj={`key-insights-tile-na-${id}`}
        >
          <EuiTitle size="xs">
            <h4>{titleString}</h4>
          </EuiTitle>
          <EuiText
            size="s"
            color="subdued"
            css={css`
              margin-top: ${euiTheme.size.s};
              font-weight: 600;
              font-size: 24px;
            `}
          >
            {'N/A'}
          </EuiText>
          <EuiText size="xs" color="subdued">
            {'Data not available'}
          </EuiText>
        </div>
      </EuiFlexItem>
    );
  }

  const lensAttributes = createKeyInsightsPanelLensAttributes({
    title: titleString,
    label: labelString,
    esqlQuery: getEsqlQuery(effectiveSpaceId),
    dataViewId: 'default-dataview',
    filterQuery,
  });

  return (
    <EuiFlexItem grow={false}>
      <div
        css={css`
          height: ${LENS_VISUALIZATION_HEIGHT}px;
          min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
          width: auto;
          display: inline-block;
          background: ${euiTheme.colors.lightestShade};
          border-radius: ${euiTheme.border.radius.medium};
        `}
        data-test-subj={`key-insights-tile-${id}`}
      >
        <VisualizationEmbeddable
          applyGlobalQueriesAndFilters={true}
          applyPageAndTabsFilters={true}
          lensAttributes={lensAttributes}
          id={id}
          timerange={timerange}
          width="auto"
          height={LENS_VISUALIZATION_HEIGHT}
          disableOnClickFilter
          inspectTitle={inspectTitle}
        />
      </div>
    </EuiFlexItem>
  );
};
