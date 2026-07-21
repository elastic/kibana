/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import { CoverageStrip } from './components/coverage_strip';
import { WatchCardGrid } from './components/watch_card_grid';
import {
  WatchesSectionLayout,
  WatchesSubnavExpandControl,
} from './components/watches_section_layout';
import * as i18n from './translations';

export const WatchesPage: React.FC = () => {
  const history = useHistory();
  const { services } = useKibana();
  const { data, isLoading, error, refetch } = useWatches();
  usePndDocTitle(i18n.PAGE_TITLE);

  const onSelectWatch = useCallback(
    (watchId: string) => {
      history.push(`/watches/${watchId}`);
    },
    [history]
  );

  const onNewWatch = useCallback(() => {
    services.notifications?.toasts.addInfo(i18n.POC_STUB_TOAST);
  }, [services.notifications]);

  const sectionCount = useMemo(() => {
    if (!data) return '';
    const active = data.watches.filter((w) => w.enabled && !w.draft).length;
    const drafts = data.watches.filter((w) => w.draft).length;
    const paused = data.watches.filter((w) => !w.enabled && !w.draft).length;
    return i18n.watchesSectionCount(active, drafts, paused);
  }, [data]);

  return (
    <WatchesSectionLayout active="watches">
      <PndPageSection>
        <PndPageHeader
          title={i18n.PAGE_TITLE}
          subtitle={i18n.PAGE_SUBTITLE}
          leftSideItems={[<WatchesSubnavExpandControl key="subnav-expand" />]}
          rightSideItems={[
            <EuiButton
              key="new-watch"
              fill
              iconType="plusInCircle"
              onClick={onNewWatch}
              data-test-subj="pndNewWatchButton"
            >
              {i18n.NEW_WATCH}
            </EuiButton>,
          ]}
        />

        {isLoading && !data ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCHES} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}

        {error && !data ? (
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
        ) : null}

        {data ? (
          <>
            {error ? (
              <>
                <EuiCallOut color="warning" iconType="warning" title={i18n.STALE_DATA_WARNING} />
                <EuiSpacer size="m" />
              </>
            ) : null}
            <CoverageStrip watches={data.watches} onSelectWatch={onSelectWatch} />
            <EuiSpacer size="l" />
            <EuiFlexGroup alignItems="baseline" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>{i18n.WATCHES_SECTION_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {sectionCount}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <WatchCardGrid
              watches={data.watches}
              onSelectWatch={onSelectWatch}
              onNewWatch={onNewWatch}
            />
          </>
        ) : null}
      </PndPageSection>
    </WatchesSectionLayout>
  );
};
