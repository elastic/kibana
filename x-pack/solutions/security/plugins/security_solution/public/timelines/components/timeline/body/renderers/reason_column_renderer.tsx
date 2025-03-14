/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useMemo } from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TableId } from '@kbn/securitysolution-data-table';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import type { ColumnRenderer } from './column_renderer';
import { REASON_FIELD_NAME } from './constants';
import { getRowRenderer } from './get_row_renderer';
import { plainColumnRenderer } from './plain_column_renderer';

export const reasonColumnRenderer: ColumnRenderer = {
  isInstance: isEqual(REASON_FIELD_NAME),

  renderColumn: ({
    columnName,
    ecsData,
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
    if (isDetails && values && ecsData && rowRenderers) {
      return values.map((value, i) => (
        <ReasonCell
          ecsData={ecsData}
          key={`reason-column-renderer-value-${scopeId}-${columnName}-${eventId}-${field.id}-${value}-${i}`}
          rowRenderers={rowRenderers}
          scopeId={scopeId}
          value={value}
        />
      ));
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

const ReasonCell: React.FC<{
  value: string | number | undefined | null;
  scopeId: string;
  ecsData: Ecs;
  rowRenderers: RowRenderer[];
}> = ({ ecsData, rowRenderers, scopeId, value }) => {
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

  // We don't currently show enriched renders for rule preview table
  const isPlainText = useMemo(() => scopeId === TableId.rulePreview, [scopeId]);

  return (
    <>
      {rowRenderer && rowRender && !isPlainText ? (
        <EuiPanel color="subdued" className="eui-xScroll" data-test-subj="reason-cell-renderer">
          <EuiText size="xs">
            <div className="eui-displayInlineBlock">{rowRender}</div>
          </EuiText>
        </EuiPanel>
      ) : (
        value
      )}
    </>
  );
};
