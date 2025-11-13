/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '@kbn/security-solution-plugin/common/constants';
import { time } from 'console';
import { GET_STARTED_URL, hostDetailsUrl, userDetailsUrl } from '../urls/navigation';
import { IS_SERVERLESS } from '../env_var_names_constants';

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

      const resizeObserverLoopErrRe =
        /^[^(ResizeObserver loop completed with undelivered notifications)]/;
      Cypress.on('uncaught:exception', (err) => {
        /* returning false here prevents Cypress from failing the test */
        if (resizeObserverLoopErrRe.test(err.message)) {
          return false;
        }
      });
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

  // other keys in incompatible format
  // TODO: remove in https://github.com/elastic/kibana/issues/239313
  window.localStorage.setItem('solutionNavigationTour:completed', 'true');
  fixCrashingChrome(window);
};

// This should work on both classic and serverless navigation
const navSearchText = {
  onboarding: 'Security / Launchpad / Get started',
  hosts: 'Security / Explore / Hosts',
  rules: 'Security / Rules / Detection rules (SIEM)',
} as const;

export const navigateUsingGlobalSearch = (page: keyof typeof navSearchText) => {
  const isServerless = Cypress.env(IS_SERVERLESS);
  if (isServerless) {
    cy.get('[data-test-subj="nav-search-reveal"]').click();
  }
  cy.get('[data-test-subj="nav-search-input"]').type(navSearchText[page]);
  cy.get('[data-test-subj="nav-search-option"]').first().click();
};

const fixCrashingChrome = (window: Window) => {
  // store real observer
  const RealResizeObserver = ResizeObserver;

  let queueFlushTimeout;
  let queue = [];

  /**
   * ResizeObserver wrapper with "enforced batches"
   */
  class ResizeObserverPolyfill {
    constructor(callback) {
      this.callback = callback;
      this.observer = new RealResizeObserver(this.check.bind(this));
    }

    observe(element) {
      this.observer.observe(element);
    }

    unobserve(element) {
      this.observer.unobserve(element);
    }

    disconnect() {
      this.observer.disconnect();
    }

    check(entries) {
      setTimeout(() => {
        // remove previous invocations of "self"
        queue = queue.filter((x) => x.cb !== this.callback);
        // put a new one
        queue.push({ cb: this.callback, args: entries });
        // trigger update
        // if (!queueFlushTimeout) {
        //   queueFlushTimeout = requestAnimationFrame(() => {
        //     queueFlushTimeout = undefined;
        //     const q = queue;
        //     queue = [];
        //     q.forEach(({ cb, args }) => cb(args));
        //   }, 0);
        // }

        queueFlushTimeout = requestAnimationFrame(() => {
          queueFlushTimeout = undefined;
          const q = queue;
          queue = [];
          q.forEach(({ cb, args }) => cb(args));
        }, 0);
      }, 0);
    }
  }

  window.ResizeObserver = ResizeObserverPolyfill;

  // cy.on('uncaught:exception', (err) => {
  //   console.log('>>>>>>> Cypress caught error: ', err);
  //   if (err.message.includes('ResizeObserver')) {
  //     return false;
  //   }
  // });
};
