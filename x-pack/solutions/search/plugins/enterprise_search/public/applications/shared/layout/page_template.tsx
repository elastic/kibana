/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { cloneElement, isValidElement, useLayoutEffect, useState } from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { FlashMessages } from '../flash_messages';
import { HttpLogic } from '../http';
import { KibanaLogic } from '../kibana';
import type { BreadcrumbTrail } from '../kibana_chrome/generate_breadcrumbs';
import { Loading } from '../loading';

import {
  createEndpointsAppHeaderMenuItem,
  EndpointsApiKeysFlyout,
  EndpointsHeaderAction,
} from './endpoints_header_action';
import * as Styles from './styles';

/*
 * EnterpriseSearchPageTemplateWrapper is a light wrapper for KibanaPageTemplate (which
 * is a light wrapper for EuiPageTemplate). It should contain only concerns shared
 * between both AS & WS, which should have their own AppSearchPageTemplate &
 * WorkplaceSearchPageTemplate sitting on top of this template (:nesting_dolls:),
 * which in turn manages individual product-specific concerns (e.g. side navs, telemetry, etc.)
 *
 * @see https://github.com/elastic/kibana/tree/main/src/plugins/kibana_react/public/page_template
 * @see https://elastic.github.io/eui/#/layout/page
 */

export type PageTemplateProps = KibanaPageTemplateProps & {
  appHeader?: React.ReactNode;
  customPageSections?: boolean; // If false, automatically wraps children in an EuiPageSection
  emptyState?: React.ReactNode;
  hideFlashMessages?: boolean;
  isLoading?: boolean;
  // Used by product-specific page templates
  pageChrome?: BreadcrumbTrail;
  pageViewTelemetry?: string;
  setPageChrome?: React.ReactNode;
  solutionNavIcon?: string;
  useEndpointHeaderActions?: boolean;
  hideEmbeddedConsole?: boolean;
};

const mergeEndpointsMenuItem = (
  menu: AppHeaderMenu | undefined,
  item: NonNullable<AppHeaderMenu['items']>[number]
): AppHeaderMenu => {
  const items = menu?.items ?? [];
  if (items.some((existing) => existing.id === item.id)) {
    return menu ?? { items: [item] };
  }
  return {
    ...menu,
    items: [...items, item],
  };
};

export const EnterpriseSearchPageTemplateWrapper: React.FC<PageTemplateProps> = ({
  appHeader,
  children,
  className,
  customPageSections,
  hideFlashMessages,
  isLoading,
  isEmptyState,
  emptyState,
  setPageChrome,
  solutionNav,
  solutionNavIcon,
  useEndpointHeaderActions = true,
  hideEmbeddedConsole = false,
  ...pageTemplateProps
}) => {
  const { readOnlyMode } = useValues(HttpLogic);
  const { renderHeaderActions, consolePlugin, capabilities, notifications, spaces } =
    useValues(KibanaLogic);

  const hasCustomEmptyState = !!emptyState;
  const showCustomEmptyState = hasCustomEmptyState && isEmptyState;

  const navIcon = solutionNavIcon ?? 'logoElasticsearch';

  const SolutionViewSwitchCallout = spaces?.ui?.components?.getSolutionViewSwitchCallout;
  const solutionNavFooter =
    notifications.tours.isEnabled() && capabilities.spaces?.manage && SolutionViewSwitchCallout ? (
      <SolutionViewSwitchCallout currentSolution="es" />
    ) : undefined;

  const [isEndpointsFlyoutOpen, setIsEndpointsFlyoutOpen] = useState(false);
  const showEndpointsInAppHeader = Boolean(appHeader) && useEndpointHeaderActions;

  useLayoutEffect(() => {
    if (useEndpointHeaderActions && !appHeader) {
      renderHeaderActions(EndpointsHeaderAction);
    }
    return () => {
      renderHeaderActions(undefined);
    };
  }, [appHeader, renderHeaderActions, useEndpointHeaderActions]);

  const resolvedAppHeader =
    showEndpointsInAppHeader && isValidElement<{ menu?: AppHeaderMenu }>(appHeader)
      ? cloneElement(appHeader, {
          menu: mergeEndpointsMenuItem(
            appHeader.props.menu,
            createEndpointsAppHeaderMenuItem({
              isSelected: isEndpointsFlyoutOpen,
              onToggle: () => setIsEndpointsFlyoutOpen((open) => !open),
            })
          ),
        })
      : appHeader;

  return (
    <KibanaPageTemplate
      {...pageTemplateProps}
      className={classNames(Styles.enterpriseSearchPageTemplate, className)}
      mainProps={{
        ...pageTemplateProps.mainProps,
        className: classNames(
          'enterpriseSearchPageTemplate__content',
          pageTemplateProps.mainProps?.className
        ),
      }}
      isEmptyState={isEmptyState && !isLoading}
      solutionNav={
        solutionNav && solutionNav.items
          ? { icon: navIcon, ...solutionNav, footer: solutionNavFooter }
          : undefined
      }
    >
      {setPageChrome}
      {resolvedAppHeader}
      {readOnlyMode && (
        <>
          <KbnWarningCallout
            announceOnMount
            title={i18n.translate('xpack.enterpriseSearch.readOnlyMode.warning', {
              defaultMessage:
                'Enterprise Search is in read-only mode. You will be unable to make changes such as creating, editing, or deleting.',
            })}
          />
          <EuiSpacer />
        </>
      )}
      {!hideFlashMessages && <FlashMessages />}
      {isLoading ? (
        <Loading />
      ) : showCustomEmptyState ? (
        emptyState
      ) : customPageSections ? (
        children
      ) : (
        <KibanaPageTemplate.Section>{children}</KibanaPageTemplate.Section>
      )}
      {!hideEmbeddedConsole && consolePlugin?.EmbeddableConsole !== undefined ? (
        <consolePlugin.EmbeddableConsole />
      ) : (
        <></>
      )}
      {showEndpointsInAppHeader && isEndpointsFlyoutOpen && (
        <EndpointsApiKeysFlyout onClose={() => setIsEndpointsFlyoutOpen(false)} />
      )}
    </KibanaPageTemplate>
  );
};
