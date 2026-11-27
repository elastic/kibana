/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import type { CspFinding, CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useSecuritySolutionContext } from '../../application/security_solution_context';
import type { OpenFindingInSystemFlyoutHandle } from '../../types';

export const useExpandableFlyoutCsp = (
  flyoutType: 'misconfiguration' | 'vulnerability' = 'misconfiguration'
) => {
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const securitySolutionContext = useSecuritySolutionContext();
  // Tracks the currently open system flyout (if any), so it can be closed when the table row is
  // deselected, and so we can reset `expandedDoc` when the user closes it directly (e.g. the
  // flyout's own close button). We intentionally never close a *previous* system flyout to open a
  // new one — see `trackSystemFlyoutHandle` below.
  const systemFlyoutHandleRef = useRef<OpenFindingInSystemFlyoutHandle | null>(null);

  if (!securitySolutionContext) return { onExpandDocClick: null };

  // The security solution injects openers that render the finding as a primary "system flyout".
  const openInSystemFlyout = securitySolutionContext.useOpenFindingInSystemFlyout();

  const closeActiveSystemFlyout = () => {
    systemFlyoutHandleRef.current?.close();
    systemFlyoutHandleRef.current = null;
  };

  const trackSystemFlyoutHandle = (handle: OpenFindingInSystemFlyoutHandle) => {
    systemFlyoutHandleRef.current = handle;
    handle.onClose.then(() => {
      if (systemFlyoutHandleRef.current === handle) {
        systemFlyoutHandleRef.current = null;
        setExpandedDoc(undefined);
      }
    });
  };

  const onExpandDocClick = (record?: DataTableRecord | undefined) => {
    if (!record) {
      closeActiveSystemFlyout();
      setExpandedDoc(undefined);
      return;
    }

    if (flyoutType === 'vulnerability') {
      const finding = record?.raw?._source as unknown as CspVulnerabilityFinding;
      setExpandedDoc(record);
      const params = {
        vulnerabilityId: finding?.vulnerability?.id,
        resourceId: finding?.resource?.id,
        packageName: finding?.package?.name,
        packageVersion: finding?.package?.version,
        eventId: finding?.event?.id,
      };
      trackSystemFlyoutHandle(openInSystemFlyout.openVulnerabilityFinding(params));
    } else {
      const finding = record?.raw?._source as unknown as CspFinding;
      setExpandedDoc(record);
      const params = {
        resourceId: finding.resource.id,
        ruleId: finding.rule.id,
      };
      trackSystemFlyoutHandle(openInSystemFlyout.openMisconfigurationFinding(params));
    }
  };

  return { expandedDoc, setExpandedDoc, onExpandDocClick };
};
