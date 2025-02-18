/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { random } from 'lodash/fp';
import moment from 'moment';
import React from 'react';

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { ALERT_DURATION, ALERT_REASON, ALERT_SEVERITY, ALERT_STATUS } from '@kbn/rule-data-utils';

import { useGetMappedNonEcsValue } from '../../../../common/utils/get_mapped_non_ecs_value';
import { TruncatableText } from '../../../../common/components/truncatable_text';
import { Severity } from '../../../components/severity';
import type { CellValueElementProps } from '../../../../timelines/components/timeline/cell_rendering';
import { DefaultCellRenderer } from '../../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { Status } from '../../../components/status';

const reason =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */
export const RenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = ({
  columnId,
  data,
  eventId,
  header,
  isDetails,
  isExpandable,
  isExpanded,
  linkValues,
  rowIndex,
  colIndex,
  setCellProps,
  scopeId,
  key,
}) => {
  const value =
    useGetMappedNonEcsValue({
      data,
      fieldName: columnId,
    })?.reduce((x) => x[0]) ?? '';

  switch (columnId) {
    case ALERT_STATUS:
      return (
        <Status data-test-subj="alert-status" status={random(0, 1) ? 'recovered' : 'active'} />
      );
    case ALERT_DURATION:
    case 'signal.duration.us':
      return <span data-test-subj="alert-duration">{moment().fromNow(true)}</span>;
    case ALERT_SEVERITY:
    case 'signal.rule.severity':
      return <Severity data-test-subj="rule-severity" severity={value} />;
    case ALERT_REASON:
    case 'signal.reason':
      return (
        <EuiLink data-test-subj="reason">
          <TruncatableText>{reason}</TruncatableText>
        </EuiLink>
      );
    default:
      // NOTE: we're using `DefaultCellRenderer` in this example configuration as a fallback, but
      // using `DefaultCellRenderer` here is entirely optional
      return (
        <DefaultCellRenderer
          columnId={columnId}
          data={data}
          eventId={eventId}
          header={header}
          isDetails={isDetails}
          isExpandable={isExpandable}
          isExpanded={isExpanded}
          linkValues={linkValues}
          rowIndex={rowIndex}
          colIndex={colIndex}
          setCellProps={setCellProps}
          scopeId={scopeId}
          key={key}
        />
      );
  }
};
