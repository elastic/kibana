/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import type { CommonProps } from '@elastic/eui';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';
import type {
  AppHeaderBack,
  AppHeaderMenu,
  AppHeaderMetadataItems,
  AppHeaderTab,
} from '@kbn/app-header';
import { AppHeaderLoading } from '@kbn/app-header';
import { SecurityAppHeader } from '../../common/components/app_header';

export interface AdministrationListPageProps {
  title: string;
  back?: AppHeaderBack;
  tabs?: AppHeaderTab[];
  menu?: AppHeaderMenu;
  metadata?: AppHeaderMetadataItems;
  docLink?: string;
  restrictWidth?: boolean | number;
  /**
   * Hides the page's `SecurityAppHeader` entirely. Used by `ArtifactListPage`, which renders its
   * own in-content title/description instead (its outer `ArtifactsPage` owns the route header).
   */
  hideHeader?: boolean;
  /**
   * Renders `AppHeaderLoading` (a skeleton that does not claim the title announcement) instead of
   * the full header while the page's initial, title-blocking data fetch is still pending. Ignored
   * when `hideHeader` is set.
   */
  isHeaderLoading?: boolean;
}

/**
 * Shared layout for Endpoint management route pages. Renders `SecurityAppHeader` (string title,
 * optional back/tabs/menu/metadata/docLink) above the page content.
 *
 * `spacing="largeBleed"` matches this page shell: management routes are rendered inside
 * `SecuritySolutionTemplateWrapper`'s `KibanaPageTemplate.Section`, which applies the default 24px
 * (`paddingSize="l"`) symmetric padding — the same shell used by Rules, Dashboards landing, and
 * Shared exception lists, which use the same `largeBleed` value for their `SecurityAppHeader`.
 */
export const AdministrationListPage = memo<
  PropsWithChildren<AdministrationListPageProps & CommonProps>
>(
  ({
    title,
    back,
    tabs,
    menu,
    metadata,
    docLink,
    children,
    restrictWidth = false,
    hideHeader = false,
    isHeaderLoading = false,
    ...otherProps
  }) => {
    const hasTabs = Boolean(tabs?.length);

    return (
      <div {...otherProps}>
        {!hideHeader && (
          <>
            {isHeaderLoading ? (
              <AppHeaderLoading back={back} spacing="largeBleed" />
            ) : (
              <SecurityAppHeader
                title={title}
                back={back}
                tabs={tabs}
                menu={menu}
                metadata={metadata}
                docLink={docLink}
                spacing="largeBleed"
              />
            )}
            {/* Pages with header tabs own the gap between the tabs and their content */}
            {!hasTabs && <EuiSpacer size="m" />}
          </>
        )}
        <EuiPageSection paddingSize="none" color="transparent" restrictWidth={restrictWidth}>
          {children}
        </EuiPageSection>
      </div>
    );
  }
);

AdministrationListPage.displayName = 'AdministrationListPage';
