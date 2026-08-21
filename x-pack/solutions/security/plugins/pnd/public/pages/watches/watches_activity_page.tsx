/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import { ActivityFeedTable, buildActivityFeed } from './components/activity_feed_table';
import * as i18n from './translations';

/**
 * Cross-watch activity feed — every recent run from every watch, newest
 * first, so "what has been happening across the whole fleet" doesn't
 * require clicking into each Watch detail page one at a time.
 *
 * Reuses the same `useWatches()` query and `Watch.recentRuns[]` data the
 * per-watch detail page already renders via `RecentRunsTable` — no new
 * endpoint. `recentRuns` already carries real workflow-execution history
 * (see `projectRecentRunsFromHistory` in project_watch.ts), so this page
 * has no dependency on the metrics-bug fix beyond sharing the same
 * `useWatches()` data source.
 */
export const WatchesActivityPage: React.FC = () => {
  usePndDocTitle(i18n.SUBNAV_ACTIVITY);
  const history = useHistory();
  const { data, isLoading } = useWatches();

  const rows = useMemo(() => buildActivityFeed(data?.watches ?? []), [data]);

  return (
    <WatchesSectionLayout active="activity">
      <PndPageSection>
        <PndPageHeader
          title={i18n.SUBNAV_ACTIVITY}
          subtitle={
            isLoading ? undefined : (
              <EuiText size="s">{i18n.ACTIVITY_TOTAL_COUNT(rows.length)}</EuiText>
            )
          }
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
        />
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <ActivityFeedTable
            rows={rows}
            onNavigateToWatch={(watchId) => history.push(`/watches/${watchId}`)}
            getInvestigationHref={(investigationId) =>
              history.createHref({ pathname: `/investigations/${investigationId}` })
            }
            onNavigateToInvestigation={(investigationId) =>
              history.push(`/investigations/${investigationId}`)
            }
          />
        )}
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
