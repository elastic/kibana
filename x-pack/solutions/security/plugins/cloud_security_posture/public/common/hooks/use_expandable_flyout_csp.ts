/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useCallback, useState } from 'react';
import { CspFinding, CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common';
import { DataTableRecord } from '@kbn/discover-utils';
import { SecuritySolutionContext } from '../../application/security_solution_context';

export const useExpandableFlyoutCsp = (
  flyoutType: 'misconfiguration' | 'vulnerability' = 'misconfiguration'
) => {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const securitySolutionContext = useContext(SecuritySolutionContext);

  const setFlyoutCloseCallback = useCallback(
    (onChange: any) => {
      // Check if the context and required methods exist
      if (securitySolutionContext && securitySolutionContext.useOnExpandableFlyoutClose) {
        securitySolutionContext.useOnExpandableFlyoutClose({
          callback: () => onChange(undefined),
        });
      }
    },
    [securitySolutionContext]
  );

  if (!securitySolutionContext || !securitySolutionContext.useExpandableFlyoutApi)
    return { onExpandDocClick: null };

  const { openFlyout, closeFlyout } = securitySolutionContext.useExpandableFlyoutApi();

  setFlyoutCloseCallback(setExpandedDoc);

  const onExpandDocClick = (record?: DataTableRecord | undefined) => {
    let finding;
    if (record) {
      if (flyoutType === 'vulnerability') {
        finding = record?.raw?._source as unknown as CspVulnerabilityFinding;
        setExpandedDoc(record);
        openFlyout({
          right: {
            id: 'findings-vulnerability-panel',
            params: {
              vulnerabilityId: finding?.vulnerability?.id,
              resourceId: finding?.resource?.id,
              packageName: finding?.package?.name,
              packageVersion: finding?.package?.version,
              eventId: finding?.event?.id,
            },
          },
        });
      } else {
        finding = record?.raw?._source as unknown as CspFinding;
        setExpandedDoc(record);
        openFlyout({
          right: {
            id: 'findings-misconfiguration-panel',
            params: {
              resourceId: finding.resource.id,
              ruleId: finding.rule.id,
            },
          },
        });
      }
    } else {
      closeFlyout();
      setExpandedDoc(undefined);
    }
  };

  return { expandedDoc, setExpandedDoc, onExpandDocClick };
};
