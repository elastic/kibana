/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useWatches } from '../../hooks/use_watches_api';
import { CoverageStrip } from './components/coverage_strip';
import { WatchCardGrid } from './components/watch_card_grid';
import { WatchesSectionLayout } from './components/watches_section_layout';
import { WATCHES_NAV_OVERVIEW_ID } from './components/pnd_watches_nav';
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
    <WatchesSectionLayout
      active={WATCHES_NAV_OVERVIEW_ID}
      title={i18n.PAGE_TITLE}
      description={i18n.PAGE_SUBTITLE}
    >
      <EuiFlexGroup direction="column" gutterSize="xl" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="plusInCircle"
                onClick={onNewWatch}
                data-test-subj="pndNewWatchButton"
              >
                {i18n.NEW_WATCH}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {isLoading && !data ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCHES} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}

        {error && !data ? (
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
        ) : null}

        {data ? (
          <>
            {error ? (
              <EuiFlexItem grow={false}>
                <KbnWarningCallout announceOnMount title={i18n.STALE_DATA_WARNING} />
              </EuiFlexItem>
            ) : null}

            <EuiFlexItem grow={false}>
              <CoverageStrip watches={data.watches} onSelectWatch={onSelectWatch} />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="baseline" gutterSize="s" wrap>
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
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WatchCardGrid watches={data.watches} onSelectWatch={onSelectWatch} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </WatchesSectionLayout>
  );
};
