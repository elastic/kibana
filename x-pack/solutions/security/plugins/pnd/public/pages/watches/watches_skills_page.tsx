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
import { buildCallableRows, CallablesTable } from './components/callables_table';
import * as i18n from './translations';

/**
 * Aggregate view of every skill referenced by any Watch's agent
 * configuration. Skills don't have a dedicated management UI/deep-link the
 * way workflows do (Agent Builder skills aren't individually routable in
 * this Kibana yet), so rows render as plain text; "Used by" still links
 * back to the owning Watch's detail page.
 */
export const WatchesSkillsPage: React.FC = () => {
  usePndDocTitle(i18n.SUBNAV_SKILLS);
  const history = useHistory();
  const { data, isLoading } = useWatches();

  const rows = useMemo(() => buildCallableRows(data?.watches ?? [], 'skill'), [data]);

  return (
    <WatchesSectionLayout active="skills">
      <PndPageSection>
        <PndPageHeader
          title={i18n.SUBNAV_SKILLS}
          subtitle={
            isLoading ? undefined : (
              <EuiText size="s">{i18n.SKILLS_TOTAL_COUNT(rows.length)}</EuiText>
            )
          }
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
        />
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <CallablesTable
            rows={rows}
            emptyMessage={i18n.SKILLS_EMPTY_MESSAGE}
            onNavigateToWatch={(watchId) => history.push(`/watches/${watchId}`)}
          />
        )}
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
