/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiSearchBar } from '@elastic/eui';
import React, { useRef, useMemo, useEffect } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { useCardUrlRewrite } from './use_card_url_rewrite';
import { PackageList } from '../package_list/package_list';

interface Props {
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
  /**
   * A list of custom items to include into the package list
   */
  customCards?: IntegrationCardItem[];
  selectedCategory?: string[];
  packageListRef?: React.Ref<HTMLDivElement>;
  flowCategory?: string | null;
  excludePackageIdList?: string[];
  onLoadingChange?: (isLoading: boolean) => void;
}

type WrapperProps = Props & {
  useAvailablePackages: AvailablePackagesHookType;
};

const fetchAvailablePackagesHook = (): Promise<AvailablePackagesHookType> =>
  import('@kbn/fleet-plugin/public')
    .then((module) => module.AvailablePackagesHook())
    .then((hook) => hook.useAvailablePackages);

const PackageListGridWrapper = ({
  useAvailablePackages,
  packageListRef,
  searchQuery,
  setSearchQuery,
  customCards,
  flowCategory,
  excludePackageIdList = [],
  onLoadingChange,
}: WrapperProps) => {
  const { filteredCards: integrationCards, isLoading } = useAvailablePackages({
    prereleaseIntegrationsEnabled: true,
  });

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);
  const rewriteUrl = useCardUrlRewrite({ category: flowCategory, search: searchQuery });

  const list: IntegrationCardItem[] = useMemo(() => {
    return (customCards ?? [])
      .concat(integrationCards)
      .filter((card) =>
        card.categories.some((category) => ['observability', 'os_system'].includes(category))
      )
      .filter((card) => !excludePackageIdList.includes(card.id))
      .map(rewriteUrl);
  }, [customCards, excludePackageIdList, integrationCards, rewriteUrl]);

  if (isLoading) return null;

  return (
    <div ref={packageListRef}>
      <EuiSearchBar
        box={{
          incremental: true,
          placeholder: 'Search integrations, technologies, data sources...',
        }}
        onChange={({ queryText, error }) => {
          if (error) return;

          setSearchQuery(queryText);
        }}
        query={searchQuery}
      />
      {searchQuery !== '' && (
        <PackageList list={list} searchTerm={searchQuery} showCardLabels={false} />
      )}
    </div>
  );
};

export const PackageListSearchForm = React.forwardRef(
  (props: Props, packageListRef?: React.Ref<HTMLDivElement>) => {
    const { onLoadingChange } = props;
    const ref = useRef<AvailablePackagesHookType | null>(null);

    const {
      error: errorLoading,
      retry: retryAsyncLoad,
      loading: asyncLoading,
    } = useAsyncRetry(async () => {
      ref.current = await fetchAvailablePackagesHook();
    });

    const isAsyncLoading = asyncLoading || ref.current === null;

    useEffect(() => {
      onLoadingChange?.(isAsyncLoading);
    }, [isAsyncLoading, onLoadingChange]);

    if (errorLoading)
      return (
        <EuiCallOut
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
            data-test-subj="xpack.observability_onboarding.asyncLoadFailureCallout.button"
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

    if (isAsyncLoading) return null;

    return (
      <PackageListGridWrapper
        {...props}
        useAvailablePackages={ref.current!}
        packageListRef={packageListRef}
      />
    );
  }
);
