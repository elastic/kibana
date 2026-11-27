/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { INGEST_DESCRIPTION } from '../../../labels';

/** How ingest is estimated, and why some applications may have no estimate. */
export function IngestTooltip({ notes }: { notes: readonly string[] }) {
  return (
    <>
      <p>{INGEST_DESCRIPTION}</p>
      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </>
  );
}
