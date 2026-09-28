/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import React, { useEffect, useState } from 'react';
import type { TimelineItem, TimelineRequestSortField } from '../../../../../common/search_strategy';
import { Direction } from '../../../../../common/search_strategy';
import type { TimelineArgs } from '../../../../timelines/containers';
import { useTimelineEventsHandler } from '../../../../timelines/containers';
import * as i18n from '../translations';

export interface HitSelection {
  _id: string;
  _index: string;
}

/**
 * Only `_id` is requested: the run payload carries `(id, index)` pairs and the server fetches
 * each source, so pulling fields here would be wasted bandwidth.
 */
const ID_ONLY_FIELDS = ['_id'];

/**
 * Newest first, so a selection trimmed to the cap keeps the most recent hits. The timeline
 * search otherwise defaults to oldest first.
 */
export const NEWEST_FIRST_SORT: TimelineRequestSortField[] = [
  { field: '@timestamp', direction: Direction.desc, type: 'date', esTypes: ['date'] },
];

export type SelectionIdSearchHandler = (
  onResponse: (response: TimelineArgs) => void,
  onError: (error: unknown) => void
) => void;

export const toHitSelections = (items: TimelineItem[]): HitSelection[] =>
  items.map(({ _id, _index }) => ({ _id, _index: _index ?? '' }));

export interface RunWorkflowSelectionScope {
  dataViewId: string;
  indexNames: string[];
  /** Serialized ES query describing the table's current filters. */
  filterQuery: string | undefined;
  from: string;
  to: string;
  runtimeMappings: RunTimeMappings;
  /**
   * Identifies this search. Keep it distinct from the table's own id so resolving a selection
   * does not disturb the table's query state.
   */
  queryId: string;
}

/**
 * Builds a search that resolves the ids of every hit matching the table's query, newest first.
 *
 * Capped rather than paged: the run payload carries the ids themselves, so the cap is what keeps
 * the request inside the payload limit.
 */
export const useRunWorkflowSelectionSearch = ({
  dataViewId,
  indexNames,
  filterQuery,
  from,
  to,
  runtimeMappings,
  queryId,
}: RunWorkflowSelectionScope): SelectionIdSearchHandler => {
  const [, , searchSelectionIds] = useTimelineEventsHandler({
    dataViewId,
    endDate: to,
    startDate: from,
    id: queryId,
    fields: ID_ONLY_FIELDS,
    indexNames,
    filterQuery,
    runtimeMappings,
    limit: MAX_RUN_WORKFLOW_DOCS,
    sort: NEWEST_FIRST_SORT,
    timerangeKind: 'absolute',
  });

  return searchSelectionIds;
};

type ResolvedSelection =
  | { status: 'ready'; selections: HitSelection[]; wasTrimmed: boolean }
  | { status: 'loading' }
  | { status: 'error' };

/**
 * Resolves what a bulk run should act on.
 *
 * A table only ever hands over the loaded page, so when the user chose "select all N" the rest
 * of the selection has to be fetched before the run payload can be built. Without `isAllSelected`
 * the loaded page *is* the selection and no search runs.
 */
export const useResolvedRunWorkflowSelection = ({
  isAllSelected,
  pageSelections,
  searchSelectionIds,
}: {
  isAllSelected: boolean;
  pageSelections: HitSelection[];
  searchSelectionIds: SelectionIdSearchHandler;
}): ResolvedSelection => {
  const [resolved, setResolved] = useState<ResolvedSelection>({ status: 'loading' });

  useEffect(() => {
    if (!isAllSelected) {
      return;
    }
    // A new search replaces whatever an earlier one resolved to, so the panel never offers a
    // selection computed for a query or time range that no longer applies.
    let isStale = false;
    setResolved({ status: 'loading' });
    searchSelectionIds(
      (response) => {
        if (isStale) {
          return;
        }
        setResolved({
          status: 'ready',
          selections: toHitSelections(response.events),
          wasTrimmed: response.totalCount > response.events.length,
        });
      },
      () => {
        if (!isStale) {
          setResolved({ status: 'error' });
        }
      }
    );
    return () => {
      isStale = true;
    };
  }, [isAllSelected, searchSelectionIds]);

  if (!isAllSelected) {
    return { status: 'ready', selections: pageSelections, wasTrimmed: false };
  }

  return resolved;
};

/** Renders the loading, error, and trimmed-selection states shared by the bulk run panels. */
export const RunWorkflowSelectionStatus = ({
  selection,
  children,
}: {
  selection: ResolvedSelection;
  children: React.ReactNode;
}) => {
  if (selection.status === 'error') {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        size="s"
        title={i18n.RUN_WORKFLOW_SELECTION_FAILED}
        data-test-subj="bulk-run-workflow-selection-error"
      />
    );
  }

  if (selection.status === 'loading') {
    return <EuiLoadingSpinner size="m" data-test-subj="bulk-run-workflow-selection-loading" />;
  }

  return (
    <>
      {selection.wasTrimmed && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            size="s"
            title={i18n.RUN_WORKFLOW_SELECTION_TRIMMED(MAX_RUN_WORKFLOW_DOCS)}
            data-test-subj="bulk-run-workflow-selection-trimmed"
          />
          <EuiSpacer size="s" />
        </>
      )}
      {children}
    </>
  );
};
