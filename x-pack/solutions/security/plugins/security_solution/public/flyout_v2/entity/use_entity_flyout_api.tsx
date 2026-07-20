/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux-v7';
import { useHistory } from 'react-router-dom';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { useKibana } from '../../common/lib/kibana';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import {
  formatFlyoutTitle,
  GENERIC_ENTITY_TITLE,
  HOST_TITLE,
  SERVICE_TITLE,
  USER_TITLE,
  RISK_INPUTS_TITLE,
  ANOMALY_INSIGHTS_TITLE,
  ALERTS_INSIGHTS_TITLE,
  MISCONFIGURATION_INSIGHTS_TITLE,
  VULNERABILITY_INSIGHTS_TITLE,
  ENTITY_GRAPH_VIEW_TITLE,
  RESOLUTION_TITLE,
  ENTRA_INSIGHTS_TITLE,
  OKTA_INSIGHTS_TITLE,
  FIELDS_TABLE_TITLE,
} from '../shared/constants/flyout_titles';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../session_context';
import type { HostProps } from './host/main';
import type { UserProps } from './user/main';
import type { ServiceProps } from './service/main';
import type { GenericEntityProps } from './generic/main';
import type { VulnerabilityInsightsProps } from './host/tools/vulnerability_insights';
import type { EntraInsightsProps } from './user/tools/entra_insights';
import type { OktaInsightsProps } from './user/tools/okta_insights';
import type { AlertsInsightsProps } from './shared/tools/alerts_insights';
import type { RiskInputsProps } from './shared/tools/risk_inputs';
import type { MisconfigurationInsightsProps } from './shared/tools/misconfiguration_insights';
import type { AnomalyInsightsProps } from './shared/tools/anomaly_insights';
import type { FieldsTableToolProps } from './shared/tools/fields_table';
import type { ResolutionProps } from './shared/tools/resolution';
import type { GraphViewProps } from './shared/tools/graph_view'; // Lazy-loaded so consumers of this hook don't statically pull the entity flyout graph into their

// Lazy-loaded so consumers of this hook don't statically pull the entity flyout graph into their
// bundle; each chunk only loads when the corresponding flyout is actually opened.
const Host = lazy(() => import('./host/main').then((m) => ({ default: m.Host })));
const User = lazy(() => import('./user/main').then((m) => ({ default: m.User })));
const Service = lazy(() => import('./service/main').then((m) => ({ default: m.Service })));
const GenericEntity = lazy(() =>
  import('./generic/main').then((m) => ({ default: m.GenericEntity }))
);
const VulnerabilityInsights = lazy(() =>
  import('./host/tools/vulnerability_insights').then((m) => ({ default: m.VulnerabilityInsights }))
);
const EntraInsights = lazy(() =>
  import('./user/tools/entra_insights').then((m) => ({ default: m.EntraInsights }))
);
const OktaInsights = lazy(() =>
  import('./user/tools/okta_insights').then((m) => ({ default: m.OktaInsights }))
);
const AlertsInsights = lazy(() =>
  import('./shared/tools/alerts_insights').then((m) => ({ default: m.AlertsInsights }))
);
const RiskInputs = lazy(() =>
  import('./shared/tools/risk_inputs').then((m) => ({ default: m.RiskInputs }))
);
const MisconfigurationInsights = lazy(() =>
  import('./shared/tools/misconfiguration_insights').then((m) => ({
    default: m.MisconfigurationInsights,
  }))
);
const AnomalyInsights = lazy(() =>
  import('./shared/tools/anomaly_insights').then((m) => ({ default: m.AnomalyInsights }))
);
const FieldsTableTool = lazy(() =>
  import('./shared/tools/fields_table').then((m) => ({ default: m.FieldsTableTool }))
);
const Resolution = lazy(() =>
  import('./shared/tools/resolution').then((m) => ({ default: m.Resolution }))
);
const GraphView = lazy(() =>
  import('./shared/tools/graph_view').then((m) => ({ default: m.GraphView }))
);

/** An optional flyout header title (typically the entity name), shown for entity flyouts. */
interface WithTitle {
  title?: string;
}

// Main entity flyouts — each reuses the component's own props, plus an optional title.
export type OpenHostFlyoutParams = HostProps & WithTitle;
export type OpenUserFlyoutParams = UserProps & WithTitle;
export type OpenServiceFlyoutParams = ServiceProps & WithTitle;
export type OpenGenericEntityFlyoutParams = GenericEntityProps & WithTitle;

export interface OpenEntityDetailsParams extends WithTitle {
  /** Entity Store engine type (`host` | `user` | `service` | other → generic). */
  engineType: string | undefined;
  /** Canonical Entity Store v2 id (`entity.id`). */
  entityId: string;
  /** Display name of the entity. */
  entityName: string | undefined;
  /** Scope id for downstream containers and queries. */
  scopeId: string;
}

// Entity tool flyouts — each reuses the tool component's own props, plus an optional title.
export type OpenEntityRiskInputsParams = RiskInputsProps & WithTitle;
export type OpenEntityAnomalyInsightsParams = AnomalyInsightsProps & WithTitle;
export type OpenEntityAlertsInsightsParams = AlertsInsightsProps & WithTitle;
export type OpenEntityMisconfigurationInsightsParams = MisconfigurationInsightsProps & WithTitle;
export type OpenEntityVulnerabilityInsightsParams = VulnerabilityInsightsProps & WithTitle;
export type OpenEntityGraphViewParams = GraphViewProps & WithTitle;
export type OpenEntityResolutionParams = ResolutionProps & WithTitle;
export type OpenEntityEntraInsightsParams = EntraInsightsProps & WithTitle;
export type OpenEntityOktaInsightsParams = OktaInsightsProps & WithTitle;
export type OpenEntityFieldsTableParams = FieldsTableToolProps & WithTitle;

export interface EntityFlyoutApi {
  /** Opens the host entity details flyout as a new, top-level flyout (fresh session). */
  openHostFlyout: (params: OpenHostFlyoutParams) => void;
  /** Opens the host entity details flyout as a child of the currently open flyout. */
  openHostFlyoutAsChild: (params: OpenHostFlyoutParams) => void;
  /** Opens the user entity details flyout as a new, top-level flyout (fresh session). */
  openUserFlyout: (params: OpenUserFlyoutParams) => void;
  /** Opens the user entity details flyout as a child of the currently open flyout. */
  openUserFlyoutAsChild: (params: OpenUserFlyoutParams) => void;
  /** Opens the service entity details flyout as a new, top-level flyout (fresh session). */
  openServiceFlyout: (params: OpenServiceFlyoutParams) => void;
  /** Opens the service entity details flyout as a child of the currently open flyout. */
  openServiceFlyoutAsChild: (params: OpenServiceFlyoutParams) => void;
  /** Opens the generic entity details flyout as a new, top-level flyout (fresh session). */
  openGenericEntityFlyout: (params: OpenGenericEntityFlyoutParams) => void;
  /** Opens the generic entity details flyout as a child of the currently open flyout. */
  openGenericEntityFlyoutAsChild: (params: OpenGenericEntityFlyoutParams) => void;
  /**
   * Opens the matching entity details flyout (host/user/service/generic, by `engineType`) as a
   * child of the currently open flyout. Use for related-entity navigation (graph, resolution).
   */
  openEntityDetailsAsChild: (params: OpenEntityDetailsParams) => void;
  /** Opens the entity Risk Inputs tool flyout. */
  openEntityRiskInputs: (params: OpenEntityRiskInputsParams) => void;
  /** Opens the entity Anomalies tool flyout. */
  openEntityAnomalyInsights: (params: OpenEntityAnomalyInsightsParams) => void;
  /** Opens the entity Alerts insights tool flyout. */
  openEntityAlertsInsights: (params: OpenEntityAlertsInsightsParams) => void;
  /** Opens the entity Misconfigurations insights tool flyout. */
  openEntityMisconfigurationInsights: (params: OpenEntityMisconfigurationInsightsParams) => void;
  /** Opens the host Vulnerabilities insights tool flyout. */
  openEntityVulnerabilityInsights: (params: OpenEntityVulnerabilityInsightsParams) => void;
  /** Opens the entity Graph view tool flyout. */
  openEntityGraphView: (params: OpenEntityGraphViewParams) => void;
  /** Opens the entity Resolution tool flyout. */
  openEntityResolution: (params: OpenEntityResolutionParams) => void;
  /** Opens the user Entra insights tool flyout. */
  openEntityEntraInsights: (params: OpenEntityEntraInsightsParams) => void;
  /** Opens the user Okta insights tool flyout. */
  openEntityOktaInsights: (params: OpenEntityOktaInsightsParams) => void;
  /** Opens the generic entity Fields table tool flyout. */
  openEntityFieldsTable: (params: OpenEntityFieldsTableParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) entity flyouts (host / user / service / generic)
 * and their tool flyouts, in the same mindset as `useExpandableFlyoutApi`, `useDocumentFlyoutApi`,
 * etc. It encapsulates the provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`) and the
 * per-flyout properties so call sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useEntityFlyoutApi = (): EntityFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const open = useCallback(
    (
      children: ReactNode,
      properties: OverlaySystemFlyoutOpenOptions,
      propagatedSessionMode = sessionMode
    ) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider value={{ session: propagatedSessionMode, historyKey }}>
              <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>
            </FlyoutSessionContextProvider>
          ),
        }),
        properties
      );
    },
    [overlays, services, store, history, sessionMode, historyKey]
  );

  // The entity flyouts differ only in their base properties (document vs tools size) and session;
  // both are kept private here so callers never reason about them — they pick the method they want.
  const mainProperties = useCallback(
    (session = sessionMode, title?: string): OverlaySystemFlyoutOpenOptions => ({
      ...defaultDocumentFlyoutProperties,
      historyKey,
      session,
      ...(title !== undefined ? { title } : {}),
    }),
    [defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  const toolProperties = useCallback(
    (title?: string): OverlaySystemFlyoutOpenOptions => ({
      ...defaultToolsFlyoutProperties,
      historyKey,
      session: 'start',
      ...(title !== undefined ? { title } : {}),
    }),
    [historyKey]
  );

  // Main entity flyouts.
  const openHostFlyout = useCallback(
    ({ title, ...props }: OpenHostFlyoutParams) => {
      const flyoutTitle = title ?? formatFlyoutTitle(HOST_TITLE, props.hostName);
      open(<Host {...props} />, mainProperties(undefined, flyoutTitle));
    },
    [open, mainProperties]
  );
  const openHostFlyoutAsChild = useCallback(
    ({ title, ...props }: OpenHostFlyoutParams) => {
      const childTitle = title ?? formatFlyoutTitle(HOST_TITLE, props.hostName);
      open(
        <Host {...props} />,
        mainProperties('inherit', buildFlyoutNavTitle(childTitle)),
        'inherit'
      );
    },
    [open, mainProperties]
  );
  const openUserFlyout = useCallback(
    ({ title, ...props }: OpenUserFlyoutParams) => {
      const flyoutTitle = title ?? formatFlyoutTitle(USER_TITLE, props.userName);
      open(<User {...props} />, mainProperties(undefined, flyoutTitle));
    },
    [open, mainProperties]
  );
  const openUserFlyoutAsChild = useCallback(
    ({ title, ...props }: OpenUserFlyoutParams) => {
      const childTitle = title ?? formatFlyoutTitle(USER_TITLE, props.userName);
      open(
        <User {...props} />,
        mainProperties('inherit', buildFlyoutNavTitle(childTitle)),
        'inherit'
      );
    },
    [open, mainProperties]
  );
  const openServiceFlyout = useCallback(
    ({ title, ...props }: OpenServiceFlyoutParams) => {
      const flyoutTitle = title ?? formatFlyoutTitle(SERVICE_TITLE, props.serviceName);
      open(<Service {...props} />, mainProperties(undefined, flyoutTitle));
    },
    [open, mainProperties]
  );
  const openServiceFlyoutAsChild = useCallback(
    ({ title, ...props }: OpenServiceFlyoutParams) => {
      const childTitle = title ?? formatFlyoutTitle(SERVICE_TITLE, props.serviceName);
      open(
        <Service {...props} />,
        mainProperties('inherit', buildFlyoutNavTitle(childTitle)),
        'inherit'
      );
    },
    [open, mainProperties]
  );
  const openGenericEntityFlyout = useCallback(
    ({ title, ...props }: OpenGenericEntityFlyoutParams) => {
      const flyoutTitle = title ?? GENERIC_ENTITY_TITLE;
      open(<GenericEntity {...props} />, mainProperties(undefined, flyoutTitle));
    },
    [open, mainProperties]
  );
  const openGenericEntityFlyoutAsChild = useCallback(
    ({ title, ...props }: OpenGenericEntityFlyoutParams) => {
      const childTitle = title ?? GENERIC_ENTITY_TITLE;
      open(
        <GenericEntity {...props} />,
        mainProperties('inherit', buildFlyoutNavTitle(childTitle)),
        'inherit'
      );
    },
    [open, mainProperties]
  );

  const openEntityDetailsAsChild = useCallback(
    ({ engineType, entityId, entityName, scopeId, title }: OpenEntityDetailsParams) => {
      let children: ReactNode;
      switch (engineType) {
        case 'host':
          children = <Host hostName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
          break;
        case 'user':
          children = <User userName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
          break;
        case 'service':
          children = (
            <Service serviceName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />
          );
          break;
        default:
          children = <GenericEntity entityId={entityId} scopeId={scopeId} />;
      }
      const childTitle = title ?? entityName ?? entityId;
      open(children, mainProperties('inherit', buildFlyoutNavTitle(childTitle)), 'inherit');
    },
    [open, mainProperties]
  );

  // Entity tool flyouts.
  const openEntityRiskInputs = useCallback(
    ({ title, ...props }: OpenEntityRiskInputsParams) =>
      open(
        <RiskInputs {...props} />,
        toolProperties(title ?? formatFlyoutTitle(RISK_INPUTS_TITLE, props.entityName))
      ),
    [open, toolProperties]
  );
  const openEntityAnomalyInsights = useCallback(
    ({ title, ...props }: OpenEntityAnomalyInsightsParams) =>
      open(
        <AnomalyInsights {...props} />,
        toolProperties(title ?? formatFlyoutTitle(ANOMALY_INSIGHTS_TITLE, props.value))
      ),
    [open, toolProperties]
  );
  const openEntityAlertsInsights = useCallback(
    ({ title, ...props }: OpenEntityAlertsInsightsParams) =>
      open(
        <AlertsInsights {...props} />,
        toolProperties(title ?? formatFlyoutTitle(ALERTS_INSIGHTS_TITLE, props.value))
      ),
    [open, toolProperties]
  );
  const openEntityMisconfigurationInsights = useCallback(
    ({ title, ...props }: OpenEntityMisconfigurationInsightsParams) =>
      open(
        <MisconfigurationInsights {...props} />,
        toolProperties(title ?? formatFlyoutTitle(MISCONFIGURATION_INSIGHTS_TITLE, props.value))
      ),
    [open, toolProperties]
  );
  const openEntityVulnerabilityInsights = useCallback(
    ({ title, ...props }: OpenEntityVulnerabilityInsightsParams) =>
      open(
        <VulnerabilityInsights {...props} />,
        toolProperties(title ?? formatFlyoutTitle(VULNERABILITY_INSIGHTS_TITLE, props.value))
      ),
    [open, toolProperties]
  );
  const openEntityGraphView = useCallback(
    ({ title, ...props }: OpenEntityGraphViewParams) =>
      open(
        <GraphView {...props} />,
        toolProperties(title ?? formatFlyoutTitle(ENTITY_GRAPH_VIEW_TITLE, props.entityName))
      ),
    [open, toolProperties]
  );
  const openEntityResolution = useCallback(
    ({ title, ...props }: OpenEntityResolutionParams) =>
      open(
        <Resolution {...props} />,
        toolProperties(title ?? formatFlyoutTitle(RESOLUTION_TITLE, props.entityName))
      ),
    [open, toolProperties]
  );
  const openEntityEntraInsights = useCallback(
    ({ title, ...props }: OpenEntityEntraInsightsParams) =>
      open(
        <EntraInsights {...props} />,
        toolProperties(title ?? formatFlyoutTitle(ENTRA_INSIGHTS_TITLE, props.value))
      ),
    [open, toolProperties]
  );
  const openEntityOktaInsights = useCallback(
    ({ title, ...props }: OpenEntityOktaInsightsParams) =>
      open(
        <OktaInsights {...props} />,
        toolProperties(title ?? formatFlyoutTitle(OKTA_INSIGHTS_TITLE, props.value))
      ),
    [open, toolProperties]
  );
  const openEntityFieldsTable = useCallback(
    ({ title, ...props }: OpenEntityFieldsTableParams) =>
      open(
        <FieldsTableTool {...props} />,
        toolProperties(title ?? formatFlyoutTitle(FIELDS_TABLE_TITLE, props.entityName))
      ),
    [open, toolProperties]
  );

  return useMemo(
    () => ({
      openHostFlyout,
      openHostFlyoutAsChild,
      openUserFlyout,
      openUserFlyoutAsChild,
      openServiceFlyout,
      openServiceFlyoutAsChild,
      openGenericEntityFlyout,
      openGenericEntityFlyoutAsChild,
      openEntityDetailsAsChild,
      openEntityRiskInputs,
      openEntityAnomalyInsights,
      openEntityAlertsInsights,
      openEntityMisconfigurationInsights,
      openEntityVulnerabilityInsights,
      openEntityGraphView,
      openEntityResolution,
      openEntityEntraInsights,
      openEntityOktaInsights,
      openEntityFieldsTable,
    }),
    [
      openHostFlyout,
      openHostFlyoutAsChild,
      openUserFlyout,
      openUserFlyoutAsChild,
      openServiceFlyout,
      openServiceFlyoutAsChild,
      openGenericEntityFlyout,
      openGenericEntityFlyoutAsChild,
      openEntityDetailsAsChild,
      openEntityRiskInputs,
      openEntityAnomalyInsights,
      openEntityAlertsInsights,
      openEntityMisconfigurationInsights,
      openEntityVulnerabilityInsights,
      openEntityGraphView,
      openEntityResolution,
      openEntityEntraInsights,
      openEntityOktaInsights,
      openEntityFieldsTable,
    ]
  );
};
