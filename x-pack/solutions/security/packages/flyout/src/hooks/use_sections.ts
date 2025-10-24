/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { selectPanels, useSelector } from '../store/redux';
import type { Panel } from '../types';

export interface UseSectionsParams {
  /**
   * List of all registered panels available for render
   */
  registeredPanels: Panel[];
}

export interface UseSectionsResult {
  /**
   * The child section to be displayed in the flyout.
   */
  childSection: Panel | undefined;
  /**
   * The main section to be displayed in the flyout.
   */
  mainSection: Panel | undefined;
}

/**
 * Hook that retrieves the main and child sections to be displayed in the flyout.
 */
export const useSections = ({ registeredPanels }: UseSectionsParams): UseSectionsResult => {
  const { child, main } = useSelector(selectPanels);

  const mainSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === main?.id),
    [main, registeredPanels]
  );
  const childSection = useMemo(
    () => registeredPanels.find((panel) => panel.key === child?.id),
    [child, registeredPanels]
  );

  return useMemo(
    () => ({
      childSection,
      mainSection,
    }),
    [childSection, mainSection]
  );
};
