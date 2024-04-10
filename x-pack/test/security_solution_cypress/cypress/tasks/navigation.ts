/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '@kbn/security-solution-plugin/common/constants';
import { GET_STARTED_URL, hostDetailsUrl, userDetailsUrl } from '../urls/navigation';

export const visit = (
  url: string,
  options?: {
    visitOptions?: Partial<Cypress.VisitOptions>;
  }
) => {
  cy.visit(url, {
    onBeforeLoad: disableNewFeaturesTours,
    ...options?.visitOptions,
  });
};

export const visitWithTimeRange = (
  url: string,
  options?: {
    visitOptions?: Partial<Cypress.VisitOptions>;
  }
) => {
  const timerangeConfig = {
    from: 1547914976217,
    fromStr: '2019-01-19T16:22:56.217Z',
    kind: 'relative',
    to: 1579537385745,
    toStr: 'now',
  };

  const timerange = encode({
    global: {
      linkTo: ['timeline'],
      timerange: timerangeConfig,
    },
    timeline: {
      linkTo: ['global'],
      timerange: timerangeConfig,
    },
  });

  cy.visit(url, {
    ...options,
    qs: {
      ...options?.visitOptions?.qs,
      timerange,
    },
    onBeforeLoad: (win) => {
      options?.visitOptions?.onBeforeLoad?.(win);

      disableNewFeaturesTours(win);
    },
    onLoad: (win) => {
      options?.visitOptions?.onLoad?.(win);
    },
  });
};

export const visitTimeline = (timelineId: string) => {
  const route = `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`;
  cy.visit(route, {
    onBeforeLoad: disableNewFeaturesTours,
  });
};

export const visitHostDetailsPage = (hostName = 'suricata-iowa') => {
  visitWithTimeRange(hostDetailsUrl(hostName));
  cy.get('[data-test-subj="loading-spinner"]').should('exist');
  cy.get('[data-test-subj="loading-spinner"]').should('not.exist');
};

export const visitGetStartedPage = () => {
  visit(GET_STARTED_URL);
  cy.get('#security-solution-app').should('exist');
};

export const visitUserDetailsPage = (userName = 'test') => {
  visitWithTimeRange(userDetailsUrl(userName));
};

/**
 * For all the new features tours we show in the app, this method disables them
 * by setting their configs in the local storage. It prevents the tours from appearing
 * on the page during test runs and covering other UI elements.
 * @param window - browser's window object
 */
const disableNewFeaturesTours = (window: Window) => {
  const tourStorageKeys = Object.values(NEW_FEATURES_TOUR_STORAGE_KEYS);
  const tourConfig = {
    isTourActive: false,
  };

  tourStorageKeys.forEach((key) => {
    window.localStorage.setItem(key, JSON.stringify(tourConfig));
  });
};
