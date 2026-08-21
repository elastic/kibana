/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { useKibana } from '../lib/kibana';

export interface UseIsCpsLinkedSearchSpaceResult {
  /** False until CPS manager has reported whether this space searches linked projects. */
  isReady: boolean;
  /**
   * True when Cross-Project Search is enabled, there is at least one linked project,
   * and the space default routing is not limited to the origin project only.
   */
  isLinkedSearchSpace: boolean;
}

/**
 * Resolves whether the current space can fan field-caps / searches out to linked CPS projects.
 * When CPS is not installed, `isReady` is true immediately and `isLinkedSearchSpace` is false.
 */
export const useIsCpsLinkedSearchSpace = (): UseIsCpsLinkedSearchSpaceResult => {
  const cpsManager = useKibana().services.cps?.cpsManager;
  const [state, setState] = useState<UseIsCpsLinkedSearchSpaceResult>(() => ({
    isReady: !cpsManager,
    isLinkedSearchSpace: false,
  }));

  useEffect(() => {
    if (!cpsManager) {
      setState({ isReady: true, isLinkedSearchSpace: false });
      return;
    }

    let cancelled = false;

    const resolveCpsLinkedSearchSpace = async () => {
      try {
        await cpsManager.whenReady();
        if (cancelled) {
          return;
        }

        const spaceSearchesLinkedProjects =
          cpsManager.getDefaultProjectRouting() !== PROJECT_ROUTING.ORIGIN;

        setState({
          isReady: true,
          isLinkedSearchSpace: cpsManager.hasLinkedProjects() && spaceSearchesLinkedProjects,
        });
      } catch {
        if (!cancelled) {
          setState({ isReady: true, isLinkedSearchSpace: false });
        }
      }
    };

    void resolveCpsLinkedSearchSpace();

    return () => {
      cancelled = true;
    };
  }, [cpsManager]);

  return state;
};
