/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { i18nStrings, securityLink } from '@kbn/security-solution-navigation/links';

import { type SecurityProductTypes } from '../../../common/config';
import { ProductLine } from '../../../common/product';
import { createStackManagementNavigationTree } from '../stack_management_navigation';
import { AiForTheSocIcon } from './icons';

const SOLUTION_NAME = i18n.translate(
  'xpack.securitySolutionServerless.socNavLinks.projectType.title',
  { defaultMessage: 'AI for SOC' }
);

export const shouldUseAINavigation = (productTypes: SecurityProductTypes) =>
  productTypes.some((productType) => productType.product_line === ProductLine.aiSoc);

export const createAiSocNavigationTree$ = (): Rx.Observable<NavigationTreeDefinition> => {
  return Rx.of({
    body: [
      {
        type: 'navGroup',
        id: 'security_solution_ai_nav',
        title: SOLUTION_NAME,
        icon: AiForTheSocIcon,
        breadcrumbStatus: 'hidden',
        defaultIsCollapsed: false,
        isCollapsible: false,
        children: [
          {
            id: 'alert_summary',
            link: securityLink(SecurityPageName.alertSummary),
            spaceBefore: 's',
          },

          {
            id: 'attack_discovery',
            link: securityLink(SecurityPageName.attackDiscovery),
          },
          {
            id: 'cases',
            spaceBefore: 'm',
            link: securityLink(SecurityPageName.case),
            children: [
              {
                id: 'cases_create',
                link: securityLink(SecurityPageName.caseCreate),
                sideNavStatus: 'hidden',
              },
              {
                id: 'cases_configure',
                link: securityLink(SecurityPageName.caseConfigure),
                sideNavStatus: 'hidden',
              },
            ],
            renderAs: 'panelOpener',
          },
          {
            id: 'configurations',
            spaceBefore: null,
            link: securityLink(SecurityPageName.configurations),
            renderAs: 'panelOpener',
            children: [
              {
                link: securityLink(SecurityPageName.configurationsAiSettings),
              },
              {
                link: securityLink(SecurityPageName.configurationsBasicRules),
              },
              {
                link: securityLink(SecurityPageName.configurationsIntegrations),
              },
            ],
          },
          {
            id: 'discover:',
            link: 'discover',
            spaceBefore: 'm',
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navItem',
        link: securityLink(SecurityPageName.landing),
        icon: 'launch',
      },
      {
        type: 'navItem',
        link: 'dev_tools',
        title: i18nStrings.devTools,
        icon: 'editorCodeBlock',
      },
      createStackManagementNavigationTree(),
    ],
  });
};
