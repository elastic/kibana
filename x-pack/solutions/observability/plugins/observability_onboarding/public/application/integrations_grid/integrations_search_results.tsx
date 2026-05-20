/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { EuiButton, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { PackageList } from '../package_list/package_list';
import { useCardUrlRewrite } from '../package_list_search_form/use_card_url_rewrite';
import { useIntegrationTileCards } from './use_integration_tile_cards';

interface Props {
  searchInput: string;
}

const fetchAvailablePackagesHook = (): Promise<AvailablePackagesHookType> =>
  import('@kbn/fleet-plugin/public')
    .then((module) => module.AvailablePackagesHook())
    .then((hook) => hook.useAvailablePackages);

const Loading = () => <EuiSkeletonText isLoading={true} lines={5} />;

interface ResultsGridProps {
  useAvailablePackages: AvailablePackagesHookType;
  searchInput: string;
  customCards: IntegrationCardItem[];
}

const ResultsGrid = ({ useAvailablePackages, searchInput, customCards }: ResultsGridProps) => {
  const { filteredCards, isLoading } = useAvailablePackages({
    prereleaseIntegrationsEnabled: true,
  });
  const rewriteUrl = useCardUrlRewrite({ category: null, search: searchInput });

  const list: IntegrationCardItem[] = useMemo(
    () =>
      customCards
        .concat(filteredCards)
        .filter((card) =>
          card.categories.some((category) => ['observability', 'os_system'].includes(category))
        )
        .map(rewriteUrl),
    [customCards, filteredCards, rewriteUrl]
  );

  if (isLoading) return <Loading />;

  return (
    <PackageList
      list={list}
      searchTerm={searchInput}
      showCardLabels={false}
      backgroundColor="transparent"
    />
  );
};

export const IntegrationsSearchResults = ({ searchInput }: Props) => {
  const customCards = useIntegrationTileCards();
  const hookRef = useRef<AvailablePackagesHookType | null>(null);

  const {
    error: errorLoading,
    retry: retryAsyncLoad,
    loading: asyncLoading,
  } = useAsyncRetry(async () => {
    hookRef.current = await fetchAvailablePackagesHook();
  });

  if (errorLoading) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.observability_onboarding.asyncLoadFailureCallout.title', {
          defaultMessage: 'Loading failure',
        })}
        color="warning"
        iconType="cross"
        size="m"
      >
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.asyncLoadFailureCallout.copy"
            defaultMessage="Some required elements failed to load."
          />
        </p>
        <EuiButton
          color="warning"
          data-test-subj="observabilityOnboardingIntegrationsSearchResultsRetryButton"
          onClick={() => {
            if (!asyncLoading) retryAsyncLoad();
          }}
        >
          <FormattedMessage
            id="xpack.observability_onboarding.asyncLoadFailureCallout.buttonContent"
            defaultMessage="Retry"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (asyncLoading || hookRef.current === null) return <Loading />;

  return (
    <ResultsGrid
      useAvailablePackages={hookRef.current}
      searchInput={searchInput}
      customCards={customCards}
    />
  );
};
