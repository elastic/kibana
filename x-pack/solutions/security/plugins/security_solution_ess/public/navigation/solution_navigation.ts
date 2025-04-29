/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { securityLink } from '@kbn/security-solution-navigation/links';
import { type Services } from '../common/services';
import { SOLUTION_NAME } from './translations';
import { createNavigationTree } from './navigation_tree';

export const registerSolutionNavigation = async (services: Services) => {
  const { securitySolution, navigation } = services;
  const navigationTree = createNavigationTree(services);

  navigation.isSolutionNavEnabled$.subscribe((isSolutionNavigationEnabled) => {
    if (isSolutionNavigationEnabled) {
      securitySolution.setSolutionNavigationTree(navigationTree);
    } else {
      securitySolution.setSolutionNavigationTree(null);
    }
  });

  navigation.addSolutionNavigation({
    id: 'security',
    title: SOLUTION_NAME,
    icon: 'logoSecurity',
    homePage: securityLink(SecurityPageName.landing),
    navigationTree$: Rx.of(navigationTree),
    dataTestSubj: 'securitySolutionSideNav',
  });
};
