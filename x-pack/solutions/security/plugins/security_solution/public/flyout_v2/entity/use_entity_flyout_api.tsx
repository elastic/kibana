/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { FlyoutOrigin, FlyoutType } from '../../common/lib/telemetry';
import {
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TOOL,
  FLYOUT_TYPE,
} from '../../common/lib/telemetry';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import {
  ALERTS_INSIGHTS_TITLE,
  ANOMALY_INSIGHTS_TITLE,
  ENTITY_GRAPH_VIEW_TITLE,
  ENTRA_INSIGHTS_TITLE,
  FIELDS_TABLE_TITLE,
  formatFlyoutTitle,
  GENERIC_ENTITY_TITLE,
  HOST_TITLE,
  MISCONFIGURATION_INSIGHTS_TITLE,
  OKTA_INSIGHTS_TITLE,
  RESOLUTION_TITLE,
  RISK_INPUTS_TITLE,
  SERVICE_TITLE,
  USER_TITLE,
  VULNERABILITY_INSIGHTS_TITLE,
} from '../shared/constants/flyout_titles';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { useFlyoutSessionContext } from '../session_context';
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
import { useFlyoutV2UrlWriter } from '../shared/url_state/flyout_v2_url_writer';
import type { FlyoutDescriptor } from '../shared/url_state/flyout_v2_url_param';
import {
  decodeFlyoutV2UrlParam,
  FLYOUT_DESCRIPTOR_KIND,
  urlParamKeyForHistoryKey,
} from '../shared/url_state/flyout_v2_url_param';

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

/**
 * An optional flyout header title (typically the entity name), shown for entity flyouts, plus the
 * UI trigger that opened it, for telemetry.
 */
interface WithTitle {
  title?: string;
  /** Which UI trigger opened this flyout/tool, when known. */
  origin?: FlyoutOrigin;
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
export type OpenEntityGraphViewParams = GraphViewProps &
  WithTitle & {
    /**
     * Parent entity flyout type, for telemetry. `GraphViewProps` doesn't carry the entity type
     * (the graph is shared across all entity types), so callers pass it explicitly.
     */
    flyoutType?: FlyoutType;
  };
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
 * etc. It encapsulates the provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`, via
 * `useOpenFlyout`) and the per-flyout properties so call sites don't repeat them. `useOpenFlyout`
 * also reports open/close telemetry for every method below.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useEntityFlyoutApi = (): EntityFlyoutApi => {
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const open = useOpenFlyout();
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);

  // Reads the first descriptor from the current URL stack without bumping the generation.
  // Used by ...AsChild openers and openEntityDetailsAsChild to get the parent descriptor
  // (close fallback) before appending the child descriptor with writeOnOpen('inherit').
  const readFirstDescriptor = useCallback((): FlyoutDescriptor | null => {
    if (!history?.location) return null;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    const stack = decodeFlyoutV2UrlParam(raw);
    return stack?.[0] ?? null;
  }, [history, urlParamKey]);

  // The entity flyouts differ only in their base properties (document vs tools size) and session;
  // both are kept private here so callers never reason about them — they pick the method they want.
  const mainProperties = useCallback(
    (session = sessionMode, title?: string) => ({
      ...defaultDocumentFlyoutProperties,
      historyKey,
      session,
      ...(title !== undefined ? { title } : {}),
    }),
    [defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  const toolProperties = useCallback(
    (title?: string) => ({
      ...defaultToolsFlyoutProperties,
      historyKey,
      session: FLYOUT_SESSION_KIND.START,
      ...(title !== undefined ? { title } : {}),
    }),
    [historyKey]
  );

  // Main entity flyouts.
  const openHostFlyout = useCallback(
    ({ title, origin, ...props }: OpenHostFlyoutParams) => {
      const flyoutTitle = title ?? formatFlyoutTitle(HOST_TITLE, props.hostName);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.host,
        hostName: props.hostName,
        entityId: props.entityId,
        scopeId: props.scopeId,
      });
      const onClose = buildOnClose(null);
      open(
        <Host {...props} />,
        { ...mainProperties(undefined, flyoutTitle), onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.HOST,
          session: sessionMode,
          origin,
        }
      );
    },
    [open, mainProperties, sessionMode, writeOnOpen, buildOnClose]
  );
  const openHostFlyoutAsChild = useCallback(
    ({ title, origin, ...props }: OpenHostFlyoutParams) => {
      const childTitle = title ?? formatFlyoutTitle(HOST_TITLE, props.hostName);
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.host,
          hostName: props.hostName,
          entityId: props.entityId,
          scopeId: props.scopeId,
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      open(
        <Host {...props} />,
        {
          ...mainProperties(FLYOUT_SESSION_KIND.INHERIT, buildFlyoutNavTitle(childTitle)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.HOST,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, mainProperties, readFirstDescriptor, writeOnOpen, buildOnClose]
  );
  const openUserFlyout = useCallback(
    ({ title, origin, ...props }: OpenUserFlyoutParams) => {
      const flyoutTitle = title ?? formatFlyoutTitle(USER_TITLE, props.userName);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.user,
        userName: props.userName,
        entityId: props.entityId,
        scopeId: props.scopeId,
      });
      const onClose = buildOnClose(null);
      open(
        <User {...props} />,
        { ...mainProperties(undefined, flyoutTitle), onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.USER,
          session: sessionMode,
          origin,
        }
      );
    },
    [open, mainProperties, sessionMode, writeOnOpen, buildOnClose]
  );
  const openUserFlyoutAsChild = useCallback(
    ({ title, origin, ...props }: OpenUserFlyoutParams) => {
      const childTitle = title ?? formatFlyoutTitle(USER_TITLE, props.userName);
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.user,
          userName: props.userName,
          entityId: props.entityId,
          scopeId: props.scopeId,
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      open(
        <User {...props} />,
        {
          ...mainProperties(FLYOUT_SESSION_KIND.INHERIT, buildFlyoutNavTitle(childTitle)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.USER,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, mainProperties, readFirstDescriptor, writeOnOpen, buildOnClose]
  );
  const openServiceFlyout = useCallback(
    ({ title, origin, ...props }: OpenServiceFlyoutParams) => {
      const flyoutTitle = title ?? formatFlyoutTitle(SERVICE_TITLE, props.serviceName);
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.service,
        serviceName: props.serviceName,
        entityId: props.entityId,
        scopeId: props.scopeId,
      });
      const onClose = buildOnClose(null);
      open(
        <Service {...props} />,
        { ...mainProperties(undefined, flyoutTitle), onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.SERVICE,
          session: sessionMode,
          origin,
        }
      );
    },
    [open, mainProperties, sessionMode, writeOnOpen, buildOnClose]
  );
  const openServiceFlyoutAsChild = useCallback(
    ({ title, origin, ...props }: OpenServiceFlyoutParams) => {
      const childTitle = title ?? formatFlyoutTitle(SERVICE_TITLE, props.serviceName);
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.service,
          serviceName: props.serviceName,
          entityId: props.entityId,
          scopeId: props.scopeId,
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      open(
        <Service {...props} />,
        {
          ...mainProperties(FLYOUT_SESSION_KIND.INHERIT, buildFlyoutNavTitle(childTitle)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.SERVICE,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, mainProperties, readFirstDescriptor, writeOnOpen, buildOnClose]
  );
  const openGenericEntityFlyout = useCallback(
    ({ title, origin, ...props }: OpenGenericEntityFlyoutParams) => {
      const flyoutTitle = title ?? GENERIC_ENTITY_TITLE;
      // GenericEntityProps is a union type; extract entityId/entityDocId safely.
      const entityId = (props as { entityId?: string }).entityId;
      const entityDocId = (props as { entityDocId?: string }).entityDocId;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.genericEntity,
        scopeId: props.scopeId,
        entityId,
        entityDocId,
      });
      const onClose = buildOnClose(null);
      open(
        <GenericEntity {...props} />,
        { ...mainProperties(undefined, flyoutTitle), onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.GENERIC,
          session: sessionMode,
          origin,
        }
      );
    },
    [open, mainProperties, sessionMode, writeOnOpen, buildOnClose]
  );
  const openGenericEntityFlyoutAsChild = useCallback(
    ({ title, origin, ...props }: OpenGenericEntityFlyoutParams) => {
      const childTitle = title ?? GENERIC_ENTITY_TITLE;
      const entityId = (props as { entityId?: string }).entityId;
      const entityDocId = (props as { entityDocId?: string }).entityDocId;
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.genericEntity,
          scopeId: props.scopeId,
          entityId,
          entityDocId,
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      open(
        <GenericEntity {...props} />,
        {
          ...mainProperties(FLYOUT_SESSION_KIND.INHERIT, buildFlyoutNavTitle(childTitle)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.GENERIC,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, mainProperties, readFirstDescriptor, writeOnOpen, buildOnClose]
  );

  const openEntityDetailsAsChild = useCallback(
    ({ engineType, entityId, entityName, scopeId, title, origin }: OpenEntityDetailsParams) => {
      let children: ReactNode;
      let descriptor: FlyoutDescriptor;
      switch (engineType) {
        case 'host':
          children = <Host hostName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
          descriptor = { kind: FLYOUT_DESCRIPTOR_KIND.host, hostName: entityName ?? '', entityId };
          break;
        case 'user':
          children = <User userName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />;
          descriptor = { kind: FLYOUT_DESCRIPTOR_KIND.user, userName: entityName ?? '', entityId };
          break;
        case 'service':
          children = (
            <Service serviceName={entityName ?? ''} entityId={entityId} scopeId={scopeId} />
          );
          descriptor = {
            kind: FLYOUT_DESCRIPTOR_KIND.service,
            serviceName: entityName ?? '',
            entityId,
          };
          break;
        default:
          children = <GenericEntity entityId={entityId} scopeId={scopeId} />;
          descriptor = { kind: FLYOUT_DESCRIPTOR_KIND.genericEntity, entityId, scopeId };
      }
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(descriptor, 'inherit');
      const onClose = buildOnClose(parentDescriptor);
      const childTitle = title ?? entityName ?? entityId;
      open(
        children,
        {
          ...mainProperties(FLYOUT_SESSION_KIND.INHERIT, buildFlyoutNavTitle(childTitle)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType:
            engineType === 'host' || engineType === 'user' || engineType === 'service'
              ? (engineType as FlyoutType)
              : FLYOUT_TYPE.GENERIC,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, mainProperties, readFirstDescriptor, writeOnOpen, buildOnClose]
  );

  // Entity tool flyouts.
  const openEntityRiskInputs = useCallback(
    ({ title, origin, ...props }: OpenEntityRiskInputsParams) => {
      const { entityType, entityName, entityId } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityRiskInputs,
        entityType: entityType as string,
        entityName,
        entityId,
      });
      // Entity tools open session:'start' (roots): the entity main is not persisted alongside the
      // tool, so closing the tool clears the param rather than reverting to the entity.
      const onClose = buildOnClose(null);
      open(
        <RiskInputs {...props} />,
        { ...toolProperties(title ?? formatFlyoutTitle(RISK_INPUTS_TITLE, entityName)), onClose },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.RISK_INPUTS,
          flyoutType: entityType,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityAnomalyInsights = useCallback(
    ({ title, origin, ...props }: OpenEntityAnomalyInsightsParams) => {
      const { entityType, value, entityId } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityAnomalyInsights,
        entityType: entityType as string,
        value,
        entityId,
      });
      const onClose = buildOnClose(null);
      open(
        <AnomalyInsights {...props} />,
        { ...toolProperties(title ?? formatFlyoutTitle(ANOMALY_INSIGHTS_TITLE, value)), onClose },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.ANOMALY_INSIGHTS,
          flyoutType: entityType,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityAlertsInsights = useCallback(
    ({ title, origin, ...props }: OpenEntityAlertsInsightsParams) => {
      const { entityType, value, entityId } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityAlertsInsights,
        entityType: entityType as string,
        value,
        entityId,
      });
      const onClose = buildOnClose(null);
      open(
        <AlertsInsights {...props} />,
        { ...toolProperties(title ?? formatFlyoutTitle(ALERTS_INSIGHTS_TITLE, value)), onClose },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.ALERTS_INSIGHTS,
          flyoutType: entityType,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityMisconfigurationInsights = useCallback(
    ({ title, origin, ...props }: OpenEntityMisconfigurationInsightsParams) => {
      const { entityType, value, entityId } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityMisconfigurationInsights,
        entityType: entityType as string,
        value,
        entityId,
      });
      const onClose = buildOnClose(null);
      open(
        <MisconfigurationInsights {...props} />,
        {
          ...toolProperties(title ?? formatFlyoutTitle(MISCONFIGURATION_INSIGHTS_TITLE, value)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.MISCONFIGURATION_INSIGHTS,
          flyoutType: entityType,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityVulnerabilityInsights = useCallback(
    ({ title, origin, ...props }: OpenEntityVulnerabilityInsightsParams) => {
      const { value, entityId, entityType } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityVulnerabilityInsights,
        value,
        entityId,
        entityType: entityType as string | undefined,
      });
      const onClose = buildOnClose(null);
      open(
        <VulnerabilityInsights {...props} />,
        {
          ...toolProperties(title ?? formatFlyoutTitle(VULNERABILITY_INSIGHTS_TITLE, value)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.VULNERABILITY_INSIGHTS,
          flyoutType: entityType ?? FLYOUT_TYPE.HOST,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityGraphView = useCallback(
    ({ title, origin, flyoutType, ...props }: OpenEntityGraphViewParams) => {
      const { entityId, scopeId, entityName } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityGraphView,
        entityId,
        scopeId,
        entityName,
        entityType: flyoutType as string | undefined,
      });
      const onClose = buildOnClose(null);
      open(
        <GraphView {...props} />,
        {
          ...toolProperties(title ?? formatFlyoutTitle(ENTITY_GRAPH_VIEW_TITLE, entityName)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.GRAPH_VIEW,
          flyoutType,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityResolution = useCallback(
    ({ title, origin, ...props }: OpenEntityResolutionParams) => {
      const { entityId, entityType, entityName, scopeId } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityResolution,
        entityId,
        entityType: entityType as string,
        entityName,
        scopeId,
      });
      const onClose = buildOnClose(null);
      open(
        <Resolution {...props} />,
        { ...toolProperties(title ?? formatFlyoutTitle(RESOLUTION_TITLE, entityName)), onClose },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.RESOLUTION,
          flyoutType: entityType,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityEntraInsights = useCallback(
    ({ title, origin, ...props }: OpenEntityEntraInsightsParams) => {
      const { managedUser, value } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityEntraInsights,
        managedUserId: managedUser._id,
        managedUserIndex: managedUser._index,
        value,
      });
      const onClose = buildOnClose(null);
      open(
        <EntraInsights {...props} />,
        { ...toolProperties(title ?? formatFlyoutTitle(ENTRA_INSIGHTS_TITLE, value)), onClose },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.ENTRA_INSIGHTS,
          flyoutType: FLYOUT_TYPE.USER,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityOktaInsights = useCallback(
    ({ title, origin, ...props }: OpenEntityOktaInsightsParams) => {
      const { managedUser, value } = props;
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.entityOktaInsights,
        managedUserId: managedUser._id,
        managedUserIndex: managedUser._index,
        value,
      });
      const onClose = buildOnClose(null);
      open(
        <OktaInsights {...props} />,
        { ...toolProperties(title ?? formatFlyoutTitle(OKTA_INSIGHTS_TITLE, value)), onClose },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.OKTA_INSIGHTS,
          flyoutType: FLYOUT_TYPE.USER,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, toolProperties, writeOnOpen, buildOnClose]
  );
  const openEntityFieldsTable = useCallback(
    ({ title, origin, ...props }: OpenEntityFieldsTableParams) =>
      // openEntityFieldsTable is intentionally not wired for URL sync: its `document` prop is a
      // full flattened entity record (Record<string, unknown>) that is not cheaply URL-serializable.
      // On refresh the parent entity main flyout restores instead (see flyout_v2_url_param.ts).
      open(
        <FieldsTableTool {...props} />,
        toolProperties(title ?? formatFlyoutTitle(FIELDS_TABLE_TITLE, props.entityName)),
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.FIELDS_TABLE,
          flyoutType: FLYOUT_TYPE.GENERIC,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
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
