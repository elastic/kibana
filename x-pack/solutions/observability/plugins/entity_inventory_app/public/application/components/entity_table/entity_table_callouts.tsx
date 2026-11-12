/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { TRUNCATION_BODY, TRUNCATION_TITLE, getTruncatedTypesText } from './translations';

/** Warns that the lists of `typeNames` hold only the most recently seen entities. */
export const EntityTableTruncationCallout = ({ typeNames }: { typeNames: readonly string[] }) => (
  // Rendered only once a section shows a truncated list, so it announces itself when it appears.
  <KbnWarningCallout
    announceOnMount
    size="s"
    title={TRUNCATION_TITLE}
    text={
      <>
        <p>{TRUNCATION_BODY}</p>
        <p>{getTruncatedTypesText(typeNames)}</p>
      </>
    }
    data-test-subj="entityInventoryTruncationCallout"
  />
);
