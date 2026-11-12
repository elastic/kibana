/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { MAX_LIST_LIMIT } from '@kbn/entity-inventory-plugin/common';
import { getTruncatedTypesText, getTruncationBody, getTruncationTitle } from './translations';

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
