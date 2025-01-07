/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepReadonly } from 'utility-types';
import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import type { EndpointArtifactPageId, EndpointManagementPageMap } from './page_reference';
import { getEndpointManagementPageMap } from './page_reference';
import type { UserAuthzAccessLevel } from './types';

const artifactPageTopTestSubjPrefix: Readonly<Record<EndpointArtifactPageId, string>> = {
  trustedApps: 'trustedAppsListPage',
  eventFilters: 'EventFiltersListPage',
  hostIsolationExceptions: 'hostIsolationExceptionsListPage',
  blocklist: 'blocklistPage',
};

const pagesById: DeepReadonly<EndpointManagementPageMap> = getEndpointManagementPageMap();

const createSubjectSelector = (selectorSuffix: string, pageId?: EndpointArtifactPageId): string => {
  if (pageId) {
    return testSubjSelector(`${artifactPageTopTestSubjPrefix[pageId]}${selectorSuffix}`);
  }

  return Object.values(artifactPageTopTestSubjPrefix)
    .map((testSubjPrefix) => testSubjSelector(testSubjPrefix + selectorSuffix))
    .join(',');
};

export const visitEndpointArtifactPage = (page: EndpointArtifactPageId): Cypress.Chainable => {
  return cy.visit(pagesById[page]);
};

export const getArtifactListEmptyStateAddButton = (
  artifactType: keyof typeof artifactPageTopTestSubjPrefix
): Cypress.Chainable => {
  return cy.getByTestSubj(`${artifactPageTopTestSubjPrefix[artifactType]}-emptyState-addButton`);
};

export const isArtifactPageShowingEmptyState = (
  pageId?: EndpointArtifactPageId
): Cypress.Chainable<boolean> => {
  const emptyPageSelector = createSubjectSelector('-emptyState', pageId);
  const otherPossiblePageViews = [
    createSubjectSelector('-list', pageId),
    testSubjSelector('noPrivilegesPage'),
  ].join(',');
  let found: boolean = false;

  return cy
    .getByTestSubj('pageContainer')
    .waitUntil(($pageContainer) => {
      if ($pageContainer.find(emptyPageSelector).length > 0) {
        found = true;
        return true;
      }

      if ($pageContainer.find(otherPossiblePageViews).length > 0) {
        found = false;
        return true;
      }

      return false;
    })
    .then(() => {
      return found;
    });
};

/**
 * Validates to ensure that the user has the given access level to an artifact page.
 * @param accessLevel
 * @param visitPage If defined, then the page (id) provided will first be `visit`ed and then auth is checked
 */
export const ensureArtifactPageAuthzAccess = (
  accessLevel: UserAuthzAccessLevel,
  visitPage?: EndpointArtifactPageId
): Cypress.Chainable => {
  if (visitPage) {
    visitEndpointArtifactPage(visitPage);
  }

  isArtifactPageShowingEmptyState().then((isEmptyState) => {
    const addButtonSelector = isEmptyState
      ? createSubjectSelector('-emptyState-addButton', visitPage)
      : createSubjectSelector('-pageAddButton', visitPage);

    if (accessLevel === 'all') {
      cy.get(addButtonSelector).should('exist');
    } else if (accessLevel === 'read') {
      cy.get(addButtonSelector).should('not.exist');
    } else {
      cy.getByTestSubj('noPrivilegesPage').should('exist');
    }
  });

  return cy.getByTestSubj('pageContainer');
};
