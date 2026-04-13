/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import type {
  MessageUpsellings,
  PageUpsellings,
  SectionUpsellings,
} from '@kbn/security-solution-upselling/service/types';
import type { ProductFeatureKeyType } from '@kbn/security-solution-features';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { SecurityProductTypes } from '../../common/config';
import {
  getEnabledProductFeatures,
  getRequiredProductTypesForFeature,
} from '../../common/pli/pli_features';
import type { Services } from '../common/services';
import { withServicesProvider } from '../common/services';
import { upsellingPages, upsellingSections, upsellingMessages } from './upsellings';

export const registerUpsellings = (productTypes: SecurityProductTypes, services: Services) => {
  const enabledPLIsSet = new Set(getEnabledProductFeatures(productTypes));

  const upsellingService = registerSecuritySolutionUpsellings(enabledPLIsSet, services);
  configurePluginsUpsellings(enabledPLIsSet, upsellingService, services);
};

/**
 * Registers the upsellings for the security solution.
 */
const registerSecuritySolutionUpsellings = (
  enabledPLIsSet: Set<ProductFeatureKeyType>,
  services: Services
): UpsellingService => {
  const upsellingService = services.securitySolution.getUpselling();

  const upsellingPagesToRegister = upsellingPages.reduce<PageUpsellings>(
    (pageUpsellings, { pageName, pli, component }) => {
      if (!enabledPLIsSet.has(pli)) {
        pageUpsellings[pageName] = withServicesProvider(component, services);
      }
      return pageUpsellings;
    },
    {}
  );

  const upsellingSectionsToRegister = upsellingSections.reduce<SectionUpsellings>(
    (sectionUpsellings, { id, pli, component }) => {
      if (!enabledPLIsSet.has(pli)) {
        sectionUpsellings[id] = withServicesProvider(component, services);
      }
      return sectionUpsellings;
    },
    {}
  );

  const upsellingMessagesToRegister = upsellingMessages.reduce<MessageUpsellings>(
    (messagesUpsellings, { id, pli, message }) => {
      if (!enabledPLIsSet.has(pli)) {
        messagesUpsellings[id] = message;
      }
      return messagesUpsellings;
    },
    {}
  );

  upsellingService.setPages(upsellingPagesToRegister);
  upsellingService.setSections(upsellingSectionsToRegister);
  upsellingService.setMessages(upsellingMessagesToRegister);

  return upsellingService;
};

/**
 * Configures the upsellings for other plugins.
 */
const configurePluginsUpsellings = (
  enabledPLIsSet: Set<ProductFeatureKeyType>,
  upsellingService: UpsellingService,
  services: Services
) => {
  const { automaticImport, workflowsManagement } = services;

  if (workflowsManagement && !enabledPLIsSet.has(ProductFeatureKey.workflows)) {
    workflowsManagement.setUnavailableInServerlessTier({
      requiredProducts: getRequiredProductTypesForFeature(ProductFeatureKey.workflows),
    });
  }

  upsellingService.sections$.subscribe((sections) => {
    automaticImport?.renderUpselling(sections.get('automatic_import'));
  });
};
