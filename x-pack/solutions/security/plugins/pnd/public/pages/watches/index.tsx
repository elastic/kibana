/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { compareWatchesForDisplay } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import { WatchesSectionLayout } from './components/watches_section_layout';
import * as i18n from './translations';

/** Entry route: land on the first catalogue watch (design IA has no grid landing). */
export const WatchesPage: React.FC = () => {
  const history = useHistory();
  const { data, isLoading, error, refetch } = useWatches();
  usePndDocTitle(i18n.PAGE_TITLE);

  useEffect(() => {
    if (!data?.watches?.length) return;
    const sorted = [...data.watches].sort(compareWatchesForDisplay);
    history.replace(`/watches/${sorted[0].id}`);
  }, [data, history]);

  if (isLoading && !data) {
    return (
      <WatchesSectionLayout active="watches">
        <PndPageSection>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCHES} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </PndPageSection>
      </WatchesSectionLayout>
    );
  }

  if (error && !data) {
    return (
      <WatchesSectionLayout active="watches">
        <PndPageSection>
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
            body={<p>{i18n.LOAD_ERROR_BODY}</p>}
            actions={
              <EuiButton onClick={() => refetch()} fill>
                {i18n.RETRY}
              </EuiButton>
            }
          />
        </PndPageSection>
      </WatchesSectionLayout>
    );
  }

  if (data && data.watches.length === 0) {
    return (
      <WatchesSectionLayout active="watches">
        <PndPageSection>
          <EuiEmptyPrompt
            iconType="eye"
            title={<h2>{i18n.NO_WATCHES_TITLE}</h2>}
            body={<p>{i18n.NO_WATCHES_BODY}</p>}
            actions={
              <EuiButton onClick={() => refetch()} fill>
                {i18n.RETRY}
              </EuiButton>
            }
          />
        </PndPageSection>
      </WatchesSectionLayout>
    );
  }

  return (
    <WatchesSectionLayout active="watches">
      <PndPageSection>
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCHES} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
