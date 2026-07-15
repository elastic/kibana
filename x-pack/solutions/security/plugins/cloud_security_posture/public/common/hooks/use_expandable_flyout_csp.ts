/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
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
  // flyout's own close button), which the legacy `useOnExpandableFlyoutClose` event never fires
  // for. We intentionally never close a *previous* system flyout to open a new one — see
  // `trackSystemFlyoutHandle` below.
  const systemFlyoutHandleRef = useRef<OpenFindingInSystemFlyoutHandle | null>(null);

  const setFlyoutCloseCallback = useCallback(
    (onChange: (value: DataTableRecord | undefined) => void) => {
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

  // When the new flyout system is enabled, the security solution injects openers that render the
  // finding as a primary "system flyout". Otherwise this is `undefined` and we fall back to the
  // legacy expandable-flyout panels.
  const openInSystemFlyout = securitySolutionContext.useOpenFindingInSystemFlyout?.();

  setFlyoutCloseCallback(setExpandedDoc);

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
      if (openInSystemFlyout) {
        closeActiveSystemFlyout();
      } else {
        closeFlyout();
      }
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
      if (openInSystemFlyout) {
        trackSystemFlyoutHandle(openInSystemFlyout.openVulnerabilityFinding(params));
      } else {
        openFlyout({ right: { id: 'findings-vulnerability-panel', params } });
      }
    } else {
      const finding = record?.raw?._source as unknown as CspFinding;
      setExpandedDoc(record);
      const params = {
        resourceId: finding.resource.id,
        ruleId: finding.rule.id,
      };
      if (openInSystemFlyout) {
        trackSystemFlyoutHandle(openInSystemFlyout.openMisconfigurationFinding(params));
      } else {
        openFlyout({ right: { id: 'findings-misconfiguration-panel', params } });
      }
    }
  };

  return { expandedDoc, setExpandedDoc, onExpandDocClick };
};
