/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useCallback } from 'react';
import { SecuritySolutionContext } from '../../application/security_solution_context';

export const useExpandableFlyoutCsp = () => {
  const securitySolutionContext = useContext(SecuritySolutionContext);

  // Define the setFlyoutCloseCallback unconditionally
  const setFlyoutCloseCallback = useCallback(
    (setExpandedDoc: any) => {
      // Check if the context and required methods exist
      if (securitySolutionContext && securitySolutionContext.useOnExpandableFlyoutClose) {
        securitySolutionContext.useOnExpandableFlyoutClose({
          callback: () => setExpandedDoc(undefined),
        });
      }
    },
    [securitySolutionContext]
  );

  // If the context or necessary methods are missing, return nulls for open/close methods
  if (!securitySolutionContext || !securitySolutionContext.useExpandableFlyoutApi) {
    return { openFlyout: null, closeFlyout: null, setFlyoutCloseCallback };
  }

  // Extract the API methods from context
  const { openFlyout, closeFlyout } = securitySolutionContext.useExpandableFlyoutApi();

  return { openFlyout, closeFlyout, setFlyoutCloseCallback };
};