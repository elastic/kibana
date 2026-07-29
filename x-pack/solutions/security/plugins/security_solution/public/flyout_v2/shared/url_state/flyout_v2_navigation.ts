/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';

interface FlyoutV2Navigation {
  urlParamKey: string;
  descriptors: FlyoutV2UrlParamValue;
}

type FlyoutV2NavigationListener = (navigation: FlyoutV2Navigation) => void;

const listeners = new Set<FlyoutV2NavigationListener>();

/**
 * Notifies the mounted Security app that same-app navigation wrote a new flyout-v2 URL.
 * Cross-app navigation is restored normally when the Security app mounts.
 */
export const notifyFlyoutV2Navigation = (navigation: FlyoutV2Navigation): void => {
  listeners.forEach((listener) => listener(navigation));
};

export const subscribeToFlyoutV2Navigation = (
  listener: FlyoutV2NavigationListener
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
