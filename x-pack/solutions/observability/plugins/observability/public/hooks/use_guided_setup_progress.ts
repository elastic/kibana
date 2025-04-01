/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

export const LOCAL_STORAGE_DISMISS_GUIDED_SETUP_PROGRESS_KEY = 'DISMISS_GUIDED_SETUP_PROGRESS';

export function useGuidedSetupProgress() {
  const dismissedGuidedSetupProgressLocalStorage = window.localStorage.getItem(
    LOCAL_STORAGE_DISMISS_GUIDED_SETUP_PROGRESS_KEY
  );
  const [isGuidedSetupProgressDismissed, setIsGuidedSetupProgressDismissed] = useState<boolean>(
    JSON.parse(dismissedGuidedSetupProgressLocalStorage || 'false')
  );

  const dismissGuidedSetupProgress = useCallback(() => {
    window.localStorage.setItem(LOCAL_STORAGE_DISMISS_GUIDED_SETUP_PROGRESS_KEY, 'true');
    setIsGuidedSetupProgressDismissed(true);
  }, []);

  return {
    isGuidedSetupProgressDismissed,
    dismissGuidedSetupProgress,
  };
}
