/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { alertSummaryLink } from '@kbn/security-solution-plugin/public';
import { attackDiscoveryLinks } from '@kbn/security-solution-plugin/public';
import { casesLinks } from '@kbn/security-solution-plugin/public';
import { configurationsLinks } from '@kbn/security-solution-plugin/public';
import { rulesLinks } from '@kbn/security-solution-plugin/public';
import { onboardingLinks } from '@kbn/security-solution-plugin/public';
import { managementLinks, getManagementFilteredLinks } from '@kbn/security-solution-plugin/public';
import type { AppLinkItems } from '@kbn/security-solution-plugin/public/common/links/types';
import { StartPlugins } from '@kbn/security-solution-plugin/public/types';
import { SecuritySolutionAiForSocStartPluginDependencies } from '../types';

export const appLinks: AppLinkItems = Object.freeze([
  alertSummaryLink,
  attackDiscoveryLinks,
  casesLinks,
  configurationsLinks,
  rulesLinks,
  onboardingLinks,
  managementLinks,
]);

export const getFilteredLinks = async (
  core: CoreStart,
  plugins: SecuritySolutionAiForSocStartPluginDependencies
): Promise<AppLinkItems> => {
  const managementFilteredLinks = await getManagementFilteredLinks(core, plugins as StartPlugins);

  return Object.freeze([
    alertSummaryLink,
    attackDiscoveryLinks,
    casesLinks,
    configurationsLinks,
    rulesLinks,
    onboardingLinks,
    managementFilteredLinks,
  ]);
};
