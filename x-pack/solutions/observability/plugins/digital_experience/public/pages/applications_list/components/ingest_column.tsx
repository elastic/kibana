/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { EuiTableComputedColumnType } from '@elastic/eui';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { ApplicationSource, ApplicationType } from '../../../../common/types/applications';
import { INGEST_LABEL } from '../../../labels';
import { metricColumnPreset } from '../../../utils/column_presets';
import { formatBytes } from '../../../utils/format_bytes';
import type { IngestLookup } from '../utils/ingest';
import { ingestOf } from '../utils/ingest';
import { IngestTooltip } from './ingest_tooltip';

/** The ingest of the table's rows, which loads apart from them. */
export interface IngestColumnState {
  /** `undefined` until it loads, or when it failed. */
  lookup: IngestLookup | undefined;
  isLoading: boolean;
  /** Why some applications have no estimate. */
  notes: string[];
}

/** The tables' default sort: by ingest, the most first, as the column has no field. */
export const SORT_BY_INGEST = { sort: { field: INGEST_LABEL, direction: 'desc' } } as const;

interface IngestRow {
  serviceName: string;
  applicationType: ApplicationType;
  source: ApplicationSource;
}

/**
 * Each row's estimated ingest. Rows without one sort last, and all rows keep their order until the
 * estimates load, so the table doesn't move while they do.
 */
export const ingestColumn = <T extends IngestRow>({
  lookup,
  isLoading,
  notes,
}: IngestColumnState): EuiTableComputedColumnType<T> => ({
  ...metricColumnPreset<T>(),
  name: INGEST_LABEL,
  nameTooltip: { content: <IngestTooltip notes={notes} /> },
  // `undefined` sorts last in both directions, and keeps the list order among the rows without one.
  sortable: (row: T) => ingestOf(lookup, row),
  render: (row: T) => {
    const bytes = ingestOf(lookup, row);
    if (bytes !== undefined) {
      return <span data-test-subj="digitalExperienceApplicationIngest">{formatBytes(bytes)}</span>;
    }
    return isLoading ? (
      <EuiLoadingSpinner size="s" data-test-subj="digitalExperienceApplicationIngestLoading" />
    ) : (
      <EmptyCellValue />
    );
  },
});
