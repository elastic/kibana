/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { PlaygroundPageMode } from '../types';

export const usePageMode = ({
  hasSelectedIndices,
  hasConnectors,
  initialPageMode = PlaygroundPageMode.chat,
}: {
  hasSelectedIndices: boolean;
  hasConnectors: boolean;
  initialPageMode?: PlaygroundPageMode;
}) => {
  const [showSetupPage, setShowSetupPage] = useState(true);
  const [pageMode, setPageMode] = useState<PlaygroundPageMode>(initialPageMode);

  useEffect(() => {
    if (pageMode === PlaygroundPageMode.chat) {
      if (showSetupPage && hasConnectors && hasSelectedIndices) {
        setShowSetupPage(false);
      } else if (!showSetupPage && (!hasConnectors || !hasSelectedIndices)) {
        setShowSetupPage(true);
      }
    } else {
      if (showSetupPage && hasSelectedIndices) {
        setShowSetupPage(false);
      } else if (!showSetupPage && !hasSelectedIndices) {
        setShowSetupPage(true);
      }
    }
  }, [hasSelectedIndices, showSetupPage, pageMode, hasConnectors]);

  return {
    showSetupPage,
    pageMode,
    setPageMode,
  };
};
