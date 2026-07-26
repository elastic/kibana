/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { useKibana } from '../../../../common/lib/kibana';

/**
 * True when Cross-Project Search is enabled, there is at least one linked project,
 * and the space default routing is not limited to the origin project only.
 */
export const useShouldShowCpsMlRuleCallout = (): boolean => {
  const cpsManager = useKibana().services.cps?.cpsManager;
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!cpsManager) {
      return;
    }

    const checkCPSProjectCount = async () => {
      try {
        await cpsManager.whenReady();
        const projectsCount = cpsManager.getTotalProjectCount();
        const hasLinkedProjects = projectsCount > 1;

        const spaceSearchesLinkedProjects =
          cpsManager.getDefaultProjectRouting() !== PROJECT_ROUTING.ORIGIN;

        setShouldShow(hasLinkedProjects && spaceSearchesLinkedProjects);
      } catch {
        setShouldShow(false);
      }
    };

    checkCPSProjectCount();
  }, [cpsManager]);

  return shouldShow;
};
