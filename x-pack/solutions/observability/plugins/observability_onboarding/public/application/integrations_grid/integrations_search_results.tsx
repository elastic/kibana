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
import { useIntegrationTiles } from './use_integration_tiles';

interface Props {
  searchTerm: string;
}

const ALLOWED_CATEGORIES = new Set(['observability', 'os_system']);

const fetchAvailablePackagesHook = (): Promise<AvailablePackagesHookType> =>
  import('@kbn/fleet-plugin/public')
    .then((module) => module.AvailablePackagesHook())
    .then((hook) => hook.useAvailablePackages);

const Loading = () => <EuiSkeletonText isLoading={true} lines={5} />;

interface ResultsGridProps {
  useAvailablePackages: AvailablePackagesHookType;
  searchTerm: string;
  customCards: IntegrationCardItem[];
}

const ResultsGrid = ({ useAvailablePackages, searchTerm, customCards }: ResultsGridProps) => {
  const { filteredCards, isLoading } = useAvailablePackages({
    prereleaseIntegrationsEnabled: true,
  });
  const rewriteUrl = useCardUrlRewrite({ category: null, search: searchTerm });

  const filteredList = useMemo(
    () =>
      customCards
        .concat(filteredCards)
        .filter((card) => card.categories.some((category) => ALLOWED_CATEGORIES.has(category))),
    [customCards, filteredCards]
  );

  const list: IntegrationCardItem[] = useMemo(
    () => filteredList.map(rewriteUrl),
    [filteredList, rewriteUrl]
  );

  if (isLoading) return <Loading />;

  return (
    <PackageList
      list={list}
      searchTerm={searchTerm}
      showCardLabels={false}
      backgroundColor="transparent"
    />
  );
};

export const IntegrationsSearchResults = ({ searchTerm }: Props) => {
  const customCards = useIntegrationTiles();
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
      searchTerm={searchTerm}
      customCards={customCards}
    />
  );
};
