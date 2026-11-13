/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type {
  InventorySourceError,
  InventoryUnavailableColumn,
} from '../../../inventory_api/types';
import {
  DIAGNOSTICS_TITLE,
  TRUNCATION_BODY,
  getSourceErrorText,
  getTruncationTitle,
  getUnavailableColumnText,
} from './translations';

/** Warns that only the most recently seen entities were returned. */
export const EntityTableTruncationCallout = ({ returned }: { returned: number }) => (
  <KbnWarningCallout
    size="s"
    title={getTruncationTitle({ returned })}
    text={<p>{TRUNCATION_BODY}</p>}
    data-test-subj="entityInventoryTruncationCallout"
  />
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
  const messages = [
    ...errors.map(getSourceErrorText),
    ...unavailableColumns.map(getUnavailableColumnText),
  ];
  if (messages.length === 0) {
    return null;
  }

  return (
    <KbnWarningCallout
      size="s"
      title={DIAGNOSTICS_TITLE}
      data-test-subj="entityInventoryDiagnosticsCallout"
    >
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </KbnWarningCallout>
  );
};
