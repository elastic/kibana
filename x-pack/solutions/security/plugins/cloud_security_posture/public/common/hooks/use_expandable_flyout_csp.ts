/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useCallback } from 'react';
import { CspFinding } from '@kbn/cloud-security-posture-common';
import { DataTableRecord } from '@kbn/discover-utils';
import { SecuritySolutionContext } from '../../application/security_solution_context';

export const useExpandableFlyoutCsp = (onChange: (data: DataTableRecord | undefined) => void) => {
  const securitySolutionContext = useContext(SecuritySolutionContext);

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

  if (!securitySolutionContext || !securitySolutionContext.useExpandableFlyoutApi)
    return { onExpandDocClick: null };

  const { openFlyout, closeFlyout } = securitySolutionContext.useExpandableFlyoutApi();

  setFlyoutCloseCallback(onChange);

  const onExpandDocClick = (record?: DataTableRecord | undefined) => {
    if (record) {
      const finding = record?.raw?._source as unknown as CspFinding;
      onChange(record);
      openFlyout({
        right: {
          id: 'findings-misconfiguration-panel',
          params: {
            resourceId: finding.resource.id,
            ruleId: finding.rule.id,
          },
        },
      });
    } else {
      closeFlyout();
      onChange(undefined);
    }
  };

  return { onExpandDocClick };
};
