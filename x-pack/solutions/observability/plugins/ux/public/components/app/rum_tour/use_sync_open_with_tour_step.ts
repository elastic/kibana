/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useUxTour } from './ux_tour_context';

/** Open while the tour is on `stepId`; close when that step ends (Next / Skip / Done). */
export const useSyncOpenWithTourStep = (stepId: string, setOpen: (open: boolean) => void): void => {
  const tour = useUxTour();
  const isStep = Boolean(tour?.isActive && tour.toursEnabled && tour.stepConfig?.stepId === stepId);

  useEffect(() => {
    if (!isStep) {
      return;
    }
    setOpen(true);
    return () => {
      setOpen(false);
    };
  }, [isStep, setOpen]);
};
