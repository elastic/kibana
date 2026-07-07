/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Flyouts } from '../constants/flyouts';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';

/**
 * Returns true if the SecuritySolution flyout is open.
 */
export const isSecuritySolutionFlyoutOpen = (query: URLSearchParams): boolean => {
  const queryHasSecuritySolutionFlyout = query.has(URL_PARAM_KEY.flyout);
  const securitySolutionFlyoutHasValue =
    query.get(URL_PARAM_KEY.flyout) !== '()' && query.get(URL_PARAM_KEY.flyout) !== '(preview:!())';
  return queryHasSecuritySolutionFlyout && securitySolutionFlyoutHasValue;
};

/**
 * Returns true if the Timeline flyout is open.
 */
export const isTimelineFlyoutOpen = (query: URLSearchParams): boolean => {
  const queryHasTimelineFlyout = query.has(URL_PARAM_KEY.timelineFlyout);
  const timelineFlyoutHasValue =
    query.get(URL_PARAM_KEY.timelineFlyout) !== '()' &&
    query.get(URL_PARAM_KEY.timelineFlyout) !== '(preview:!())';
  return queryHasTimelineFlyout && timelineFlyoutHasValue;
};

/**
 * Hook that returns which flyout is the user currently interacting with.
 * If the url contains timelineFlyout parameter and its value is not empty, we know the timeline flyout is rendered.
 * As it is always on top of the normal flyout, we can deduce which flyout the user is interacting with.
 */
export const useWhichFlyout = (): string | null => {
  const query = new URLSearchParams(window.location.search);

  const securitySolutionFlyoutOpen = isSecuritySolutionFlyoutOpen(query);
  const timelineFlyoutOpen = isTimelineFlyoutOpen(query);

  if (securitySolutionFlyoutOpen && timelineFlyoutOpen) {
    return Flyouts.timeline;
  }

  if (securitySolutionFlyoutOpen) {
    return Flyouts.securitySolution;
  }

  if (timelineFlyoutOpen) {
    return Flyouts.timeline;
  }

  return null;
};
