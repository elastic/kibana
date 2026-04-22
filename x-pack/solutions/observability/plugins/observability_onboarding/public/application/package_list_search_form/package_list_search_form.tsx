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
import { createPortal } from 'react-dom';
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
  /**
   * When an element is passed, the search bar and package list render there (e.g. Integrations on
   * the Version 2 landing page). When `null`, portaling is requested but the host is not ready
   * yet — UI is kept off-screen until the host mounts. When `undefined`, render inline at the
   * mount location (default).
   */
  portaledUiContainerEl?: HTMLElement | null;
  /** When true, the search field is not rendered (package list still appears when `searchQuery` is set). */
  hideSearchBar?: boolean;
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
  portaledUiContainerEl,
  hideSearchBar = false,
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

  const inner = (
    <>
      {!hideSearchBar && (
        <EuiSearchBar
          box={{
            incremental: true,
            placeholder: i18n.translate(
              'xpack.observabilityOnboarding.packageListSearchForm.searchPlaceholder',
              {
                defaultMessage: 'Search integrations...',
              }
            ),
          }}
          onChange={({ queryText, error }) => {
            if (error) return;

            setSearchQuery(queryText);
          }}
          query={searchQuery}
        />
      )}
      {searchQuery !== '' && (
        <PackageList list={list} searchTerm={searchQuery} showCardLabels={false} />
      )}
    </>
  );

  const wrapped = <div ref={packageListRef}>{inner}</div>;

  if (portaledUiContainerEl) {
    return createPortal(wrapped, portaledUiContainerEl);
  }

  if (portaledUiContainerEl === null) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          border: 0,
        }}
      >
        {wrapped}
      </div>
    );
  }

  return wrapped;
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
