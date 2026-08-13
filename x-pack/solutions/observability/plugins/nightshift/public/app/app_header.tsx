/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig, AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

const nightshiftPageTitle = i18n.translate('xpack.nightshift.pageTitle', {
  defaultMessage: 'Nightshift',
});

const significantEventsLabel = i18n.translate('xpack.nightshift.significantEventsLinkLabel', {
  defaultMessage: 'Significant Events',
});

const memoryLabel = i18n.translate('xpack.nightshift.memoryLinkLabel', {
  defaultMessage: 'Memory',
});

const agenticOnboardingLabel = i18n.translate('xpack.nightshift.agenticOnboardingLinkLabel', {
  defaultMessage: 'Agentic Onboarding',
});

const significantEventsEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNIFICANT_EVENTS,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

const memoryEbtProps = getEbtProps({
  action: NIGHTSHIFT_EBT_ACTIONS.VIEW_MEMORY,
  element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
});

// App menu items do not expose arbitrary data attributes. Their run callback fires before the
// delegated document click handler, so the EBT attributes are present when that handler inspects it.
const applyEbtProps = (
  params: AppMenuRunActionParams | undefined,
  ebtProps: Record<string, string>
): void => {
  if (!params) {
    return;
  }

  Object.entries(ebtProps).forEach(([attribute, value]) => {
    params.triggerElement.setAttribute(attribute, value);
  });
};

export function NightshiftAppHeader({
  onSignificantEventsClick,
  significantEventsHref,
  onMemoryClick,
  memoryHref,
  onAgenticOnboardingClick,
  title,
  back,
}: {
  onSignificantEventsClick: () => void | Promise<void>;
  significantEventsHref: string;
  onMemoryClick: () => void | Promise<void>;
  memoryHref: string;
  /** When set, Agentic Onboarding appears in the More menu (Memory page only). */
  onAgenticOnboardingClick?: () => void;
  title?: string;
  back?: { href: string; label: string };
}): React.ReactElement {
  const menu = useMemo<AppMenuConfig>(() => {
    const items: NonNullable<AppMenuConfig['items']> = [
      {
        id: 'nightshiftSignificantEvents',
        label: significantEventsLabel,
        iconType: 'significantEvents',
        href: significantEventsHref,
        overflow: true,
        run: (params) => {
          applyEbtProps(params, significantEventsEbtProps);
          void onSignificantEventsClick();
        },
        testId: 'nightshiftSignificantEventsLink',
      },
      {
        id: 'nightshiftMemory',
        label: memoryLabel,
        iconType: 'productML',
        href: memoryHref,
        overflow: true,
        run: (params) => {
          applyEbtProps(params, memoryEbtProps);
          void onMemoryClick();
        },
        testId: 'nightshiftMemoryLink',
      },
    ];

    if (onAgenticOnboardingClick) {
      items.push({
        id: 'nightshiftAgenticOnboarding',
        label: agenticOnboardingLabel,
        iconType: 'sparkles',
        overflow: true,
        run: () => onAgenticOnboardingClick(),
        testId: 'nightshiftAgenticOnboardingLink',
      });
    }

    return { items };
  }, [
    memoryHref,
    onAgenticOnboardingClick,
    onMemoryClick,
    onSignificantEventsClick,
    significantEventsHref,
  ]);

  return <AppHeader title={title ?? nightshiftPageTitle} menu={menu} back={back} />;
}
