/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ComponentType, ReactNode } from 'react';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { FleetSetup } from '@kbn/fleet-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type {
  FindingMisconfigurationFlyoutContentProps,
  FindingMisconfigurationFlyoutFooterProps,
  FindingsVulnerabilityFlyoutContentProps,
  FindingsVulnerabilityFlyoutFooterProps,
  FindingsVulnerabilityFlyoutHeaderProps,
  FindingsMisconfigurationFlyoutContentProps,
  FindingsMisconfigurationFlyoutHeaderProps,
  FindingsMisconfigurationPanelExpandableFlyoutProps,
  FindingsVulnerabilityPanelExpandableFlyoutProps,
  FindingVulnerabilityFullFlyoutContentProps,
} from '@kbn/cloud-security-posture';
import type { CspRouterProps } from './application/csp_router';
import type { CloudSecurityPosturePageId } from './common/navigation/types';

export interface UseOnCloseParams {
  /**
   * Function to call when the event is dispatched
   */
  callback: (id: string) => void;
}

/**
 * The cloud security posture's public plugin setup interface.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CspClientPluginSetup {}

/**
 * The cloud security posture's public plugin start interface.
 */
export interface CspClientPluginStart {
  /** Gets the cloud security posture router component for embedding in the security solution. */
  getCloudSecurityPostureRouter(): ComponentType<CspRouterProps>;
  getCloudSecurityPostureMisconfigurationFlyout: () => {
    Component: React.FC<
      FindingsMisconfigurationPanelExpandableFlyoutProps['params'] & {
        children?: (props: FindingMisconfigurationFlyoutContentProps) => ReactNode;
      }
    >;
    Header: React.FC<FindingsMisconfigurationFlyoutHeaderProps>;
    Body: React.FC<FindingsMisconfigurationFlyoutContentProps>;
    Footer: React.FC<FindingMisconfigurationFlyoutFooterProps>;
    /** The "take action" control (create detection rule) without any flyout footer chrome. */
    TakeAction: React.FC<FindingMisconfigurationFlyoutFooterProps>;
  };
  getCloudSecurityPostureVulnerabilityFlyout: () => {
    Component: React.FC<
      FindingsVulnerabilityPanelExpandableFlyoutProps['params'] & {
        children?: (props: FindingVulnerabilityFullFlyoutContentProps) => ReactNode;
      }
    >;
    Header: React.FC<FindingsVulnerabilityFlyoutHeaderProps>;
    Body: React.FC<FindingsVulnerabilityFlyoutContentProps>;
    Footer: React.FC<FindingsVulnerabilityFlyoutFooterProps>;
    /** The "take action" control (create detection rule) without any flyout footer chrome. */
    TakeAction: React.FC<FindingsVulnerabilityFlyoutFooterProps>;
  };
}

export interface CspClientPluginSetupDeps {
  // required
  data: DataPublicPluginSetup;
  fleet: FleetSetup;
  cloud: CloudSetup;
  uiActions: UiActionsSetup;
  // optional
  usageCollection?: UsageCollectionSetup;
}

/**
 * Methods exposed from the security solution to the cloud security posture application.
 */
export interface CspSecuritySolutionContext {
  /** Gets the `FiltersGlobal` component for embedding a filter bar in the security solution application. */
  getFiltersGlobalComponent: () => ComponentType<{ children: ReactNode }>;
  /** Gets the `SpyRoute` component for navigation highlighting and breadcrumbs. */
  getSpyRouteComponent: () => ComponentType<{
    pageName: CloudSecurityPosturePageId;
    state?: Record<string, string | undefined>;
  }>;
  useExpandableFlyoutApi?: () => ExpandableFlyoutApi;
  useOnExpandableFlyoutClose?: ({ callback }: UseOnCloseParams) => void;
  /**
   * Returns openers that render a finding as a primary "system flyout" (the security solution's
   * v2 flyout), or `undefined` when the new flyout system is disabled. When available, the
   * findings pages open these instead of the legacy expandable-flyout panels.
   */
  useOpenFindingInSystemFlyout?: () => OpenFindingInSystemFlyout | undefined;
}

/**
 * Handle to a finding opened via {@link OpenFindingInSystemFlyout}, allowing the caller to close it
 * (e.g. when the underlying table row is deselected or another finding is opened) and to react
 * when it gets closed some other way (e.g. the user dismissing it directly).
 */
export interface OpenFindingInSystemFlyoutHandle {
  /** Closes the opened system flyout. Does nothing if it is already closed. */
  close: () => void;
  /** Resolves once the system flyout is closed, whether via `close()` or user interaction. */
  onClose: Promise<void>;
}

/**
 * Openers that render a CSP finding as a primary security solution system flyout.
 * Params mirror the query inputs accepted by the misconfiguration / vulnerability findings queries.
 */
export interface OpenFindingInSystemFlyout {
  openMisconfigurationFinding: (params: {
    resourceId: string;
    ruleId: string;
  }) => OpenFindingInSystemFlyoutHandle;
  openVulnerabilityFinding: (params: {
    vulnerabilityId?: string | string[];
    resourceId?: string;
    packageName?: string | string[];
    packageVersion?: string | string[];
    eventId?: string;
  }) => OpenFindingInSystemFlyoutHandle;
}

export type CloudSecurityPostureStartServices = Pick<
  CoreStart,
  'notifications' | 'analytics' | 'i18n' | 'theme'
>;
