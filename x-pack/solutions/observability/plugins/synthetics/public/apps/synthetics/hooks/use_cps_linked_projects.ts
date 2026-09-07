/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { kibanaService } from '../../../utils/kibana_service';

/**
 * Whether CPS has finished loading the project list, and whether any linked
 * projects exist. Used so Getting Started cannot treat an origin-only empty
 * SO list as a fresh install while linked-project pings may still arrive.
 */
export const useCpsLinkedProjects = (): { cpsReady: boolean; hasLinkedProjects: boolean } => {
  const cpsManager = kibanaService.startPlugins?.cps?.cpsManager;
  const [cpsReady, setCpsReady] = useState(!cpsManager);

  useEffect(() => {
    if (!cpsManager) {
      setCpsReady(true);
      return;
    }

    let cancelled = false;
    cpsManager.whenReady().then(() => {
      if (!cancelled) {
        setCpsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cpsManager]);

  return {
    cpsReady,
    hasLinkedProjects: Boolean(cpsManager?.hasLinkedProjects()),
  };
};
