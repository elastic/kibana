/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import { useGetMappedNonEcsValue } from '../../../../common/utils/get_mapped_non_ecs_value';
import { columnRenderers } from '../body/renderers';
import { getColumnRenderer } from '../body/renderers/get_column_renderer';
import type { CellValueElementProps } from '.';
import { getLinkColumnDefinition } from '../../../../common/lib/cell_actions/helpers';

const StyledContent = styled.div<{ $isDetails: boolean }>`
  padding: ${({ $isDetails }) => ($isDetails ? '0 8px' : undefined)};
  width: 100%;
  margin: 0 auto;
`;

export const DefaultCellRenderer: React.FC<CellValueElementProps> = ({
  data,
  ecsData,
  eventId,
  header,
  isDetails,
  isTimeline,
  linkValues,
  rowRenderers,
  scopeId,
  truncate,
  asPlainText,
  context,
}) => {
  const asPlainTextDefault = useMemo(() => {
    return (
      getLinkColumnDefinition(header.id, header.type, header.linkField) !== undefined && !isTimeline
    );
  }, [header.id, header.linkField, header.type, isTimeline]);

  const values = useGetMappedNonEcsValue({
    data,
    fieldName: header.id,
  });
  const styledContentClassName = isDetails
    ? 'eui-textBreakWord'
    : 'eui-displayInlineBlock eui-textTruncate';
  return (
    <StyledContent className={styledContentClassName} $isDetails={isDetails}>
      {getColumnRenderer(header.id, columnRenderers, data, context).renderColumn({
        asPlainText: asPlainText ?? asPlainTextDefault, // we want to render value with links as plain text but keep other formatters like badge. Except rule name for non preview tables
        columnName: header.id,
        ecsData,
        eventId,
        field: header,
        isDetails,
        linkValues,
        rowRenderers,
        scopeId,
        truncate,
        values,
        context,
      })}
    </StyledContent>
  );
};
