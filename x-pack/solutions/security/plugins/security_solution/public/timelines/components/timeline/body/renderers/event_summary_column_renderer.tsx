/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useMemo } from 'react';

import styled from 'styled-components';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import type { ColumnRenderer } from './column_renderer';
import { EVENT_SUMMARY_FIELD_NAME } from './constants';
import { getRowRenderer } from './get_row_renderer';
import { plainColumnRenderer } from './plain_column_renderer';

const EventRenderedFlexItem = styled(EuiFlexItem)`
  div:first-child {
    padding-left: 0px;

    div {
      margin: 0px;
    }
  }
`;

export const eventSummaryColumnRenderer: ColumnRenderer = {
  isInstance: isEqual(EVENT_SUMMARY_FIELD_NAME),

  renderColumn: ({
    ecsData,
    columnName,
    eventId,
    field,
    isDetails,
    linkValues,
    rowRenderers = [],
    scopeId,
    truncate,
    values,
  }: {
    columnName: string;
    ecsData?: Ecs;
    eventId?: string;
    field: ColumnHeaderOptions;
    isDetails?: boolean;
    linkValues?: string[] | null | undefined;
    rowRenderers?: RowRenderer[];
    scopeId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
  }) => {
    if (ecsData && rowRenderers) {
      return (
        <SummaryCell
          ecsData={ecsData}
          key={`reason-column-renderer-value-${scopeId}-${columnName}-${eventId}-${field.id}`}
          rowRenderers={rowRenderers}
          scopeId={scopeId}
          values={values}
        />
      );
    } else {
      return plainColumnRenderer.renderColumn({
        columnName,
        eventId,
        field,
        isDetails,
        linkValues,
        scopeId,
        truncate,
        values,
      });
    }
  },
};

const SummaryCell: React.FC<{
  scopeId: string;
  ecsData: Ecs;
  rowRenderers: RowRenderer[];
  values: string[] | undefined | null;
}> = ({ ecsData, rowRenderers, scopeId, values }) => {
  const rowRenderer = useMemo(
    () => getRowRenderer({ data: ecsData, rowRenderers }),
    [ecsData, rowRenderers]
  );

  const rowRender = useMemo(() => {
    return (
      rowRenderer &&
      rowRenderer.renderRow({
        data: ecsData,
        scopeId,
      })
    );
  }, [rowRenderer, ecsData, scopeId]);

  return (
    <EuiFlexGroup gutterSize="none" direction="column" className="eui-fullWidth">
      {rowRenderer && rowRender ? (
        <EventRenderedFlexItem className="eui-xScroll">
          <div className="eui-displayInlineBlock" style={{ width: 'fit-content' }}>
            {rowRender}
          </div>
        </EventRenderedFlexItem>
      ) : (
        values && <EuiFlexItem data-test-subj="plain-text-reason">{values}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
