/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

const GUIDE_TOUR_KEY = 'searchIndicesIngestDataGuideTour';

export const useGuideTour = () => {
  const hasDismissedGuide = localStorage.getItem(GUIDE_TOUR_KEY) === 'dismissed';
  const [tourIsOpen, setTourIsOpen] = useState(!hasDismissedGuide);
  return {
    tourIsOpen,
    setTourIsOpen: (isOpen: boolean) => {
      setTourIsOpen(isOpen);
      localStorage.setItem(GUIDE_TOUR_KEY, isOpen ? '' : 'dismissed');
    },
  };
};
