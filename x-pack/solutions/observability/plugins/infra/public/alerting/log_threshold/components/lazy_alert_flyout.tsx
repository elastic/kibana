/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';

const AlertFlyout = React.lazy(() =>
  import('./alert_flyout').then((module) => ({ default: module.AlertFlyout }))
);

export const LazyAlertFlyout = ({
  visible,
  setVisible,
}: {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => (
  <Suspense fallback={null}>
    <AlertFlyout visible={visible} setVisible={setVisible} />
  </Suspense>
);
