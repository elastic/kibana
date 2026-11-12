/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { MAX_LIST_LIMIT } from '@kbn/entity-inventory-plugin/common';
import type { SourceError, UnavailableColumn } from '@kbn/entity-inventory-plugin/common';
import {
  DIAGNOSTICS_TITLE,
  getSourceErrorText,
  getTruncatedTypesText,
  getTruncationBody,
  getTruncationTitle,
  getUnavailableColumnText,
} from './translations';

/** Warns that the lists of `typeNames` hold only the `MAX_LIST_LIMIT` most recently seen entities. */
export const EntityTableTruncationCallout = ({ typeNames }: { typeNames: readonly string[] }) => (
  <KbnWarningCallout
    size="s"
    title={getTruncationTitle(MAX_LIST_LIMIT)}
    text={
      <>
        <p>{getTruncationBody(MAX_LIST_LIMIT)}</p>
        <p>{getTruncatedTypesText(typeNames)}</p>
      </>
    }
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
  errors: readonly SourceError[];
  unavailableColumns: readonly UnavailableColumn[];
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
