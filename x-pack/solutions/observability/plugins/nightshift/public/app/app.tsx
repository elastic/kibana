/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { usePageReady } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { isHttpNotFoundError } from '../common/http_error';
import { useFetchInvestigations } from '../hooks/use_fetch_investigations';
import {
  INVESTIGATION_LIST_PAGE_SIZES,
  InvestigationList,
  type InvestigationListPageSize,
} from '../investigation/investigation_list';
import { InvestigationDetailFlyout } from '../investigation/investigation_detail_flyout';
import {
  clearNightshiftInvestigationIdParam,
  getNightshiftInvestigationIdFromSearch,
  setNightshiftInvestigationIdParam,
} from '../common/url_params';
import { NightshiftHeader } from './header';

export function NightshiftApp(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();

  const [size, setSize] = useState<InvestigationListPageSize>(INVESTIGATION_LIST_PAGE_SIZES[0]);
  const { data, error, isFetching, isLoading, refetch } = useFetchInvestigations({ size });

  const investigations = useMemo(() => data?.results ?? [], [data]);
  const selectedInvestigationId = useMemo(
    () => getNightshiftInvestigationIdFromSearch(search),
    [search]
  );

  const showAllEventsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    deepLinkId: 'events',
  });

  const handleInvestigationClick = useCallback(
    (investigation: ListInvestigationItem) => {
      const params = new URLSearchParams(history.location.search);
      setNightshiftInvestigationIdParam(params, investigation.investigation_id);
      history.replace({ search: params.toString() });
    },
    [history]
  );

  const handleFlyoutClose = useCallback(() => {
    const params = new URLSearchParams(history.location.search);
    clearNightshiftInvestigationIdParam(params);
    history.replace({ search: params.toString() });
  }, [history]);

  const hasActiveInvestigations = investigations.some(
    ({ status }) => status === 'pending' || status === 'running'
  );

  usePageReady({
    isReady: !isLoading && !error,
    isRefreshing: isFetching && !isLoading,
    customMetrics: {
      key1: 'investigation_count',
      value1: investigations.length,
      key2: 'investigation_total',
      value2: data?.total ?? 0,
      key3: 'active_investigation_count',
      value3: investigations.filter(({ status }) => status === 'pending' || status === 'running')
        .length,
      key4: 'failed_investigation_count',
      value4: investigations.filter(({ status }) => status === 'failed').length,
    },
    meta: {
      description: '[ttfmp_nightshift] The Nightshift landing page has loaded investigations.',
    },
  });

  // Only treat a load failure as fatal when there is nothing to show; a failed
  // background refetch that still has cached data degrades to a non-blocking warning.
  if (!isLoading && error && !data) {
    if (isHttpNotFoundError(error)) {
      return (
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          css={css`
            margin-top: ${euiTheme.size.l};
          `}
          title={i18n.translate('xpack.nightshift.investigations.unavailableTitle', {
            defaultMessage: 'Investigations are not available in this deployment',
          })}
        />
      );
    }
    return <LoadingErrorCallout onRetry={() => refetch()} />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        background: ${euiTheme.colors.backgroundBaseSubdued};
        box-sizing: border-box;
        margin-top: ${euiTheme.size.l};
        padding-bottom: calc(${euiTheme.size.xxl} * 1.5);
      `}
    >
      <NightshiftHeader
        isLoading={isLoading}
        hasActiveInvestigations={hasActiveInvestigations}
        showAllEventsHref={showAllEventsHref}
      />

      {error && data && (
        <div
          css={css`
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            size="s"
            title={i18n.translate('xpack.nightshift.investigations.refreshWarningTitle', {
              defaultMessage: 'Showing the last loaded results; refreshing failed.',
            })}
          >
            <EuiButtonEmpty
              color="warning"
              data-test-subj="nightshiftRefreshRetryButton"
              flush="left"
              iconType="refresh"
              onClick={() => refetch()}
              size="s"
            >
              {i18n.translate('xpack.nightshift.retryButtonText', {
                defaultMessage: 'Retry',
              })}
            </EuiButtonEmpty>
          </EuiCallOut>
        </div>
      )}

      <InvestigationList
        investigations={investigations}
        total={data?.total ?? 0}
        size={size}
        onSizeChange={setSize}
        selectedInvestigationId={selectedInvestigationId}
        onInvestigationClick={handleInvestigationClick}
      />

      {selectedInvestigationId && (
        <InvestigationDetailFlyout
          key={selectedInvestigationId}
          investigationId={selectedInvestigationId}
          onClose={handleFlyoutClose}
        />
      )}
    </EuiFlexGroup>
  );
}

function LoadingErrorCallout({ onRetry }: { onRetry: () => void }): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType="warning"
      title={i18n.translate('xpack.nightshift.investigations.loadingErrorTitle', {
        defaultMessage: 'Unable to load investigations',
      })}
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiButton
        color="danger"
        data-test-subj="nightshiftLoadingErrorRetryButton"
        iconType="refresh"
        onClick={onRetry}
        size="s"
      >
        {i18n.translate('xpack.nightshift.retryButtonText', {
          defaultMessage: 'Retry',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
