/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

import { LifecycleFlyout } from './lifecycle_flyout';
import { readLifecycleAlertId } from './helpers/lifecycle_search_params';

/**
 * The overlay half of the four-phase lifecycle, mounted once above every PND route (see
 * `components/app_chrome/app_chrome_layout`).
 *
 * It decides one thing — whether an overlay is open, and for which discovery — by reading the
 * location. That is what lets any page open it with `useOpenLifecycle` without a provider being
 * mounted above that page, lets the browser Back button close it, and lets a lifecycle worth talking
 * about be pasted into a chat.
 *
 * Everything the overlay *looks* like lives in `LifecycleFlyout`, which is only rendered once the
 * discovery id is known, so no tab has to cope with an `undefined` id.
 */
export const LifecycleFlyoutHost: React.FC = () => {
  const { search } = useLocation();

  const correlationId = readLifecycleAlertId(search);

  if (correlationId == null) {
    return null;
  }

  return <LifecycleFlyout correlationId={correlationId} />;
};
