/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useMultipleNodesSelected } from '../../hooks/use_multiple_nodes_selected';

interface GraphExpandPopoverSyncProps {
  onClosePopovers: () => void;
}

/** Closes graph expand popovers when marquee multi-select is active. */
export const GraphExpandPopoverSync = ({ onClosePopovers }: GraphExpandPopoverSyncProps) => {
  const isMultipleNodesSelected = useMultipleNodesSelected();

  useEffect(() => {
    if (isMultipleNodesSelected) {
      onClosePopovers();
    }
  }, [isMultipleNodesSelected, onClosePopovers]);

  return null;
};
