/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import { buildCallableRows, CallablesTable } from './components/callables_table';
import * as i18n from './translations';

/**
 * Aggregate view of every managed workflow referenced by any Watch — "where
 * is this workflow used across the fleet", complementing the per-watch
 * capability list on the Watch detail page. Data comes from the same
 * `useWatches()` query the Watches list/detail pages already use; no new
 * endpoint needed since `Watch.callables[]` already carries every
 * `kind: 'workflow'` reference with enabled/gated/lastRun state.
 */
export const WatchesWorkflowsPage: React.FC = () => {
  usePndDocTitle(i18n.SUBNAV_WORKFLOWS);
  const { services } = useKibana();
  const history = useHistory();
  const { data, isLoading } = useWatches();

  const rows = useMemo(() => buildCallableRows(data?.watches ?? [], 'workflow'), [data]);

  return (
    <WatchesSectionLayout active="workflows">
      <PndPageSection>
        <PndPageHeader
          title={i18n.SUBNAV_WORKFLOWS}
          subtitle={
            isLoading ? undefined : (
              <EuiText size="s">{i18n.WORKFLOWS_TOTAL_COUNT(rows.length)}</EuiText>
            )
          }
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
        />
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <CallablesTable
            rows={rows}
            emptyMessage={i18n.WORKFLOWS_EMPTY_MESSAGE}
            getHref={(workflowId) =>
              services.application?.getUrlForApp('workflows', { path: `/${workflowId}` }) ??
              `/app/workflows/${workflowId}`
            }
            onNavigateToWatch={(watchId) => history.push(`/watches/${watchId}`)}
          />
        )}
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
