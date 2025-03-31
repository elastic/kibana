/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import type { SecuritySolutionCellRendererFeature } from '@kbn/discover-shared-plugin/public';
import type { ColumnHeaderType } from '../../../common/types';
import type { Maybe } from '../../../common/search_strategy';
import { DefaultCellRenderer } from '../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { ONE_DISCOVER_SCOPE_ID } from '../constants';

export type SecuritySolutionRowCellRendererGetter = Awaited<
  ReturnType<SecuritySolutionCellRendererFeature['getRenderer']>
>;

const ALLOWED_DISCOVER_RENDERED_FIELDS = ['host.name', 'user.name', 'source.ip', 'destination.ip'];

export const getCellRendererForGivenRecord: SecuritySolutionRowCellRendererGetter = (
  fieldName: string
) => {
  if (!ALLOWED_DISCOVER_RENDERED_FIELDS.includes(fieldName)) return undefined;
  return function UnifiedFieldRenderBySecuritySolution(props: DataGridCellValueElementProps) {
    // convert discover data format to timeline data format
    const data: TimelineNonEcsData[] = useMemo(
      () =>
        Object.keys(props.row.flattened).map((field) => ({
          field,
          value: Array.isArray(props.row.flattened[field])
            ? (props.row.flattened[field] as Maybe<string[]>)
            : ([props.row.flattened[field]] as Maybe<string[]>),
        })),
      [props.row.flattened]
    );

    const header = useMemo(() => {
      return {
        id: props.columnId,
        columnHeaderType: 'not-filtered' as ColumnHeaderType,
        type: props.dataView.getFieldByName(props.columnId)?.type,
      };
    }, [props.columnId, props.dataView]);

    return (
      <DefaultCellRenderer
        data={data}
        ecsData={undefined}
        eventId={props.row.id}
        header={header}
        isDetails={props.isDetails}
        isTimeline={false}
        linkValues={undefined}
        rowRenderers={undefined}
        scopeId={ONE_DISCOVER_SCOPE_ID}
        asPlainText={false}
        context={undefined}
        isExpandable={props.isExpandable}
        rowIndex={props.rowIndex}
        colIndex={props.colIndex}
        setCellProps={props.setCellProps}
        isExpanded={props.isExpanded}
        columnId={props.columnId}
      />
    );
  };
};
