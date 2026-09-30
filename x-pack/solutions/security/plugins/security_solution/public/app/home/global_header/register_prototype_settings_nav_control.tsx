/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { ChromeStart } from '@kbn/core/public';

const LazyPrototypeSettingsNavControl = lazy(async () => {
  const { PrototypeSettingsNavControl } = await import('./prototype_settings_nav_control');
  return { default: PrototypeSettingsNavControl };
});

/**
 * Mounts Prototype settings on the top chrome header, left of help. Order 100
 * is below newsfeed (1000) so Classic / Project / Chrome Next can split
 * `registerRight` around the help button without moving the user menu.
 */
export const registerPrototypeSettingsNavControl = (chrome: ChromeStart): void => {
  chrome.navControls.registerRight({
    order: 100,
    content: (
      <Suspense fallback={null}>
        <LazyPrototypeSettingsNavControl />
      </Suspense>
    ),
  });
};
