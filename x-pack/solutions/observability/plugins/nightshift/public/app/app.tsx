/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { usePageReady } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem, Severity } from '@kbn/nightshift-investigations-plugin/common';
import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { useKibana } from '../hooks/use_kibana';
import { isHttpNotFoundError } from '../common/http_error';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import { useInvestigationSections } from '../hooks/use_investigation_sections';
import {
  InvestigationList,
  type InvestigationListHandle,
} from '../investigation/investigation_list';
import { InvestigationDetailFlyout } from '../investigation/investigation_detail_flyout';
import { InvestigationSeverityTiles } from '../investigation/investigation_severity_tiles';
import {
  clearNightshiftInvestigationIdParam,
  getNightshiftInvestigationIdFromSearch,
  getNightshiftSearchQueryFromSearch,
  getNightshiftSeverityFromSearch,
  setNightshiftInvestigationIdParam,
  setNightshiftSearchQueryParam,
  setNightshiftSeverityParam,
} from '../common/url_params';
import { NightshiftHeader } from './header';

function isSeverity(value: string | undefined): value is Severity {
  return SEVERITY_OPTIONS.some((severity) => severity === value);
}

export function NightshiftApp(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { application, nightshiftInvestigations } = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();
  const sectionsRef = useRef<InvestigationListHandle>(null);
  const didScrollFromUrl = useRef(false);

  // Read filter state from URL so it survives navigation and is shareable.
  const searchQuery = useMemo(() => getNightshiftSearchQueryFromSearch(search), [search]);
  const rawSeverity = useMemo(() => getNightshiftSeverityFromSearch(search), [search]);
  const activeSeverity: Severity | undefined = useMemo(
    () => (isSeverity(rawSeverity) ? rawSeverity : undefined),
    [rawSeverity]
  );

  const {
    sections,
    severityCounts,
    hasActiveInvestigations,
    isInitialLoading,
    isFetching,
    totalCount,
    loadedCount,
    refetchAll,
  } = useInvestigationSections({ query: searchQuery });

  const isInvestigationsAvailable = nightshiftInvestigations?.investigationsClient != null;

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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(history.location.search);
      setNightshiftSearchQueryParam(params, e.target.value);
      history.replace({ search: params.toString() });
    },
    [history]
  );

  const handleSeverityClick = useCallback(
    (severity: Severity) => {
      const params = new URLSearchParams(history.location.search);
      setNightshiftSeverityParam(params, severity);
      history.replace({ search: params.toString() });
      sectionsRef.current?.scrollToSeverity(severity);
      didScrollFromUrl.current = true;
    },
    [history]
  );

  useEffect(() => {
    if (!activeSeverity || didScrollFromUrl.current || isInitialLoading) {
      return;
    }
    sectionsRef.current?.scrollToSeverity(activeSeverity);
    didScrollFromUrl.current = true;
  }, [activeSeverity, isInitialLoading]);

  // Only treat a load failure as fatal when there is nothing to show; a failed
  // background refetch that still has cached data degrades to a non-blocking warning.
  const allFailed =
    !isInitialLoading &&
    sections.every((section) => section.error && section.investigations.length === 0);
  const loadedInvestigations = useMemo(
    () => sections.flatMap((section) => section.investigations),
    [sections]
  );

  usePageReady({
    isReady: !isInitialLoading && !allFailed,
    isRefreshing: isFetching && !isInitialLoading,
    customMetrics: {
      key1: 'investigation_count',
      value1: loadedCount,
      key2: 'investigation_total',
      value2: totalCount,
      key3: 'active_investigation_count',
      value3: loadedInvestigations.filter(
        ({ status }) => status === 'pending' || status === 'running'
      ).length,
      key4: 'failed_investigation_count',
      value4: loadedInvestigations.filter(({ status }) => status === 'failed').length,
    },
    meta: {
      description: '[ttfmp_nightshift] The Nightshift landing page has loaded investigations.',
    },
  });

  if (!isInvestigationsAvailable || allFailed) {
    const fatalError = sections.find((section) => section.error)?.error ?? null;
    if (!isInvestigationsAvailable || isHttpNotFoundError(fatalError)) {
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
    return <LoadingErrorCallout onRetry={refetchAll} />;
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
        isLoading={isInitialLoading}
        hasActiveInvestigations={hasActiveInvestigations}
        showAllEventsHref={showAllEventsHref}
      />

      <EuiSpacer size="l" />

      <EuiFieldSearch
        data-test-subj="nightshiftInvestigationsSearchInput"
        placeholder={i18n.translate('xpack.nightshift.investigations.searchPlaceholder', {
          defaultMessage: 'Search',
        })}
        value={searchQuery ?? ''}
        onChange={handleSearchChange}
        isClearable
        fullWidth
      />

      <EuiSpacer size="m" />

      <InvestigationSeverityTiles
        severityCounts={severityCounts}
        onSeverityClick={handleSeverityClick}
      />

      <EuiSpacer size="l" />

      <InvestigationList
        ref={sectionsRef}
        sections={sections}
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
        {RETRY_BUTTON_LABEL}
      </EuiButton>
    </EuiCallOut>
  );
}
