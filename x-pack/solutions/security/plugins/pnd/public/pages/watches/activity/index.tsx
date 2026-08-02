/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';

import { usePndDocTitle } from '../../../hooks/use_pnd_doc_title';
import { useRuns } from '../../../hooks/use_runs_api';
import { PndQueryState } from '../../../states';
import { watchLabel } from '../../conversations/helpers/watch_label';
import { WATCHES_NAV_ACTIVITY_ID } from '../components/pnd_watches_nav';
import { WatchesSectionLayout } from '../components/watches_section_layout';
import { RunsTable } from './components/runs_table';
import { clearRunsWatchIdSearch, readRunsWatchId } from './helpers/read_runs_watch_id';
import * as i18n from '../translations';

/**
 * `/watches/activity` — the run and trust ledger.
 *
 * Every recent execution of the two PND orchestrator watches, each row linking to
 * the real Workflows execution behind it and to the four-phase lifecycle of the
 * discovery that started it. This is the page the subnav has called "Run & trust
 * ledger" since before there was anything to put on it.
 *
 * Kept inside `WatchesSectionLayout` so the subnav highlight keeps working, and
 * the route stays declared above `/watches/:watchId` so `activity` is never read
 * as a watch id (`pages/watches/routes.test.tsx` pins that). The layout owns the
 * page header and the subnav re-expand control, so this page supplies only its
 * title and description.
 *
 * The `?watchId=` filter is a URL param rather than component state, so watch
 * detail's "View all runs" can land here already scoped and a filtered ledger can
 * be pasted to someone else. It is applied server-side by the route.
 */
export const WatchesActivityPage: React.FC = () => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const watchId = readRunsWatchId(search);
  const { data, error, isLoading, refetch } = useRuns({ watchId });
  usePndDocTitle(i18n.SUBNAV_ACTIVITY);

  const runs = data?.runs.runs ?? [];

  const onClearWatchFilter = useCallback(
    () => history.push({ pathname, search: clearRunsWatchIdSearch(search) }),
    [history, pathname, search]
  );

  return (
    <WatchesSectionLayout
      active={WATCHES_NAV_ACTIVITY_ID}
      description={i18n.STUB_ACTIVITY_SUBTITLE}
      title={i18n.SUBNAV_ACTIVITY}
    >
      <>
        {watchId != null ? (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" data-test-subj="pndRunsWatchFilter" size="xs">
                  {i18n.watchFilterLabel(watchLabel(watchId))}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="pndRunsClearWatchFilter"
                  flush="both"
                  onClick={onClearWatchFilter}
                  size="xs"
                >
                  {i18n.CLEAR_WATCH_FILTER}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        ) : null}

        <PndQueryState
          emptyBody={i18n.ACTIVITY_EMPTY_BODY}
          emptyTitle={i18n.ACTIVITY_EMPTY_TITLE}
          error={error}
          isAttackDiscoveryWorkflowsEnabled={data?.isAttackDiscoveryWorkflowsEnabled}
          isEmpty={runs.length === 0}
          isLoading={isLoading}
          loadingLabel={i18n.ACTIVITY_LOADING}
          onRetry={refetch}
        >
          <RunsTable runs={runs} />
        </PndQueryState>
      </>
    </WatchesSectionLayout>
  );
};
