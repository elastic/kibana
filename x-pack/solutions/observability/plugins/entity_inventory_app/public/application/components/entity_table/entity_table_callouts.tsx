/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import type {
  InventorySourceError,
  InventoryUnavailableColumn,
} from '../../../inventory_api/types';
import {
  DIAGNOSTICS_TITLE,
  TRUNCATION_BODY,
  getSourceErrorText,
  getTruncationTitle,
  getTruncationTotalUnknownTitle,
  getUnavailableColumnText,
} from './translations';

/** Warns that only the most recently seen entities were returned. */
export const EntityTableTruncationCallout = ({
  returned,
  total,
}: {
  returned: number;
  total: number | null;
}) => (
  <EuiCallOut
    color="warning"
    iconType="warning"
    size="s"
    title={
      total === null
        ? getTruncationTotalUnknownTitle({ returned })
        : getTruncationTitle({ returned, total })
    }
    data-test-subj="entityInventoryTruncationCallout"
  >
    <p>{TRUNCATION_BODY}</p>
  </EuiCallOut>
);

/**
 * Lists the sources that failed and the columns some sources cannot provide. Deliberately minimal
 * until a design exists for it.
 */
export const EntityTableDiagnosticsCallout = ({
  errors,
  unavailableColumns,
}: {
  errors: readonly InventorySourceError[];
  unavailableColumns: readonly InventoryUnavailableColumn[];
}) => {
  if (errors.length === 0 && unavailableColumns.length === 0) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      size="s"
      title={DIAGNOSTICS_TITLE}
      data-test-subj="entityInventoryDiagnosticsCallout"
    >
      <EuiText size="s">
        <ul>
          {errors.map((error, index) => (
            <li key={`error-${index}`}>{getSourceErrorText(error)}</li>
          ))}
          {unavailableColumns.map((unavailableColumn, index) => (
            <li key={`column-${index}`}>{getUnavailableColumnText(unavailableColumn)}</li>
          ))}
        </ul>
      </EuiText>
    </EuiCallOut>
  );
};
