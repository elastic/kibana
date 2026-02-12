/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiSkeletonText,
} from '@elastic/eui';
import React, { useRef, useMemo, useState, useCallback } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { useCardUrlRewrite } from './use_card_url_rewrite';
import { PackageList } from '../package_list/package_list';
import { useFleetSettings } from '../../hooks/use_fleet_settings';
import { BetaIntegrationsToggle } from '../../components/beta_integrations_toggle';

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
}

type WrapperProps = Props & {
  useAvailablePackages: AvailablePackagesHookType;
  prereleaseIntegrationsEnabled: boolean;
  onPrereleaseToggle: (enabled: boolean) => void;
};

const fetchAvailablePackagesHook = (): Promise<AvailablePackagesHookType> =>
  import('@kbn/fleet-plugin/public')
    .then((module) => module.AvailablePackagesHook())
    .then((hook) => hook.useAvailablePackages);

const Loading = () => <EuiSkeletonText isLoading={true} lines={5} />;

const PackageListGridWrapper = ({
  useAvailablePackages,
  packageListRef,
  searchQuery,
  setSearchQuery,
  customCards,
  flowCategory,
  excludePackageIdList = [],
  prereleaseIntegrationsEnabled,
  onPrereleaseToggle,
}: WrapperProps) => {
  const { filteredCards: integrationCards, isLoading } = useAvailablePackages({
    prereleaseIntegrationsEnabled,
  });
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

  if (isLoading) return <Loading />;

  return (
    <div ref={packageListRef}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiSearchBar
            box={{
              incremental: true,
            }}
            onChange={({ queryText, error }) => {
              if (error) return;

              setSearchQuery(queryText);
            }}
            query={searchQuery}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BetaIntegrationsToggle
            prereleaseIntegrationsEnabled={prereleaseIntegrationsEnabled}
            onToggle={onPrereleaseToggle}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {searchQuery !== '' && (
        <PackageList list={list} searchTerm={searchQuery} showCardLabels={false} />
      )}
    </div>
  );
};

export const PackageListSearchForm = React.forwardRef(
  (props: Props, packageListRef?: React.Ref<HTMLDivElement>) => {
    const ref = useRef<AvailablePackagesHookType | null>(null);
    const {
      prereleaseIntegrationsEnabled,
      isLoading: isLoadingSettings,
      refetch: refetchSettings,
    } = useFleetSettings();

    // Local state to immediately reflect toggle changes before refetch completes
    const [localPrereleaseEnabled, setLocalPrereleaseEnabled] = useState<boolean | undefined>(
      undefined
    );

    const handlePrereleaseToggle = useCallback(
      (enabled: boolean) => {
        setLocalPrereleaseEnabled(enabled);
        // Refetch settings to confirm the change was persisted
        refetchSettings();
      },
      [refetchSettings]
    );

    // Use local state if available, otherwise use fetched setting
    const effectivePrereleaseEnabled = localPrereleaseEnabled ?? prereleaseIntegrationsEnabled;

    const {
      error: errorLoading,
      retry: retryAsyncLoad,
      loading: asyncLoading,
    } = useAsyncRetry(async () => {
      ref.current = await fetchAvailablePackagesHook();
    });

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

    if (asyncLoading || ref.current === null || isLoadingSettings) return <Loading />;

    return (
      <PackageListGridWrapper
        {...props}
        useAvailablePackages={ref.current}
        packageListRef={packageListRef}
        prereleaseIntegrationsEnabled={effectivePrereleaseEnabled}
        onPrereleaseToggle={handlePrereleaseToggle}
      />
    );
  }
);
