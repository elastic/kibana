/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
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
}

export const KeyInsightsTile: React.FC<KeyInsightsTileProps> = ({
  title,
  label,
  getEsqlQuery,
  id,
  inspectTitle,
  spaceId: propSpaceId,
}) => {
  const { euiTheme } = useEuiTheme();
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
