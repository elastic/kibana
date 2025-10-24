/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type {
  FindingsMisconfigurationPanelExpandableFlyoutPropsNonPreview,
  FindingsMisconfigurationPanelExpandableFlyoutPropsPreview,
  FindingsVulnerabilityPanelExpandableFlyoutPropsNonPreview,
  FindingsVulnerabilityPanelExpandableFlyoutPropsPreview,
} from '@kbn/cloud-security-posture';
import type { GraphGroupedNodePreviewPanelProps } from '@kbn/cloud-security-posture-graph';
import { GraphGroupedNodePreviewPanelKey } from '@kbn/cloud-security-posture-graph';
import { Flyout } from '@kbn/flyout';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { Provider as ReduxProvider } from 'react-redux';
import { CellActionsProvider } from '@kbn/cell-actions';
import { HashRouter } from 'react-router-dom';
import { getStore } from '../common/store';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { SessionViewMainPanel } from './document_details/session_view';
import { AnalyzerMainPanel } from './document_details/analyzer';
import type { GenericEntityDetailsExpandableFlyoutProps } from './entity_details/generic_details_left';
import {
  GenericEntityDetailsPanel,
  GenericEntityDetailsPanelKeyV2,
} from './entity_details/generic_details_left';
import type { GenericEntityPanelExpandableFlyoutProps } from './entity_details/generic_right';
import { GenericEntityPanel } from './entity_details/generic_right';
import type { EaseDetailsProps } from './ease/types';
import { EaseDetailsProvider } from './ease/context';
import { EasePanel } from './ease';
import { SessionViewPanelProvider } from './document_details/session_view_panels/context';
import type { SessionViewPanelProps } from './document_details/session_view_panels';
import { SessionViewPanel } from './document_details/session_view_panels';
import type { NetworkExpandableFlyoutProps } from './network_details';
import { NetworkPanel, NetworkPanelKeyV2, NetworkPreviewPanelKeyV2 } from './network_details';
import {
  DocumentDetailsAlertReasonPanelKeyV2,
  DocumentDetailsAnalyzerPanelKeyV2,
  DocumentDetailsIsolateHostPanelKeyV2,
  DocumentDetailsLeftPanelKeyV2,
  DocumentDetailsMainAnalyzerPanelKeyV2,
  DocumentDetailsMainSessionViewPanelKeyV2,
  DocumentDetailsPreviewPanelKeyV2,
  DocumentDetailsRightPanelKeyV2,
  DocumentDetailsSessionViewPanelKeyV2,
} from './document_details/shared/constants/panel_keys';
import type { IsolateHostPanelProps } from './document_details/isolate_host';
import { IsolateHostPanel } from './document_details/isolate_host';
import { IsolateHostPanelProvider } from './document_details/isolate_host/context';
import type { DocumentDetailsProps } from './document_details/shared/types';
import { DocumentDetailsProvider } from './document_details/shared/context';
import { RightPanel } from './document_details/right';
import { LeftPanel } from './document_details/left';
import { PreviewPanel } from './document_details/preview';
import type { AlertReasonPanelProps } from './document_details/alert_reason';
import { AlertReasonPanel } from './document_details/alert_reason';
import { AlertReasonPanelProvider } from './document_details/alert_reason/context';
import type { RulePanelExpandableFlyoutProps } from './rule_details/right';
import { RulePanel, RulePanelKeyV2, RulePreviewPanelKeyV2 } from './rule_details/right';
import type { UserPanelExpandableFlyoutProps } from './entity_details/user_right';
import { UserPanel, UserPreviewPanelKeyV2 } from './entity_details/user_right';
import type { UserDetailsExpandableFlyoutProps } from './entity_details/user_details_left';
import { UserDetailsPanel, UserDetailsPanelKeyV2 } from './entity_details/user_details_left';
import type { HostPanelExpandableFlyoutProps } from './entity_details/host_right';
import { HostPanel, HostPreviewPanelKeyV2 } from './entity_details/host_right';
import type { HostDetailsExpandableFlyoutProps } from './entity_details/host_details_left';
import { HostDetailsPanel, HostDetailsPanelKeyV2 } from './entity_details/host_details_left';
import type { AnalyzerPanelExpandableFlyoutProps } from './document_details/analyzer_panels';
import { AnalyzerPanel } from './document_details/analyzer_panels';
import {
  GenericEntityPanelKeyV2,
  HostPanelKeyV2,
  ServicePanelKeyV2,
  UserPanelKeyV2,
} from './entity_details/shared/constants';
import type { ServicePanelExpandableFlyoutProps } from './entity_details/service_right';
import { ServicePanel } from './entity_details/service_right';
import type { ServiceDetailsExpandableFlyoutProps } from './entity_details/service_details_left';
import {
  ServiceDetailsPanel,
  ServiceDetailsPanelKeyV2,
} from './entity_details/service_details_left';
import {
  MisconfigurationFindingsPanelKeyV2,
  MisconfigurationFindingsPreviewPanelKeyV2,
} from './csp_details/findings_flyout/constants';
import { FindingsMisconfigurationPanel } from './csp_details/findings_flyout/findings_right';
import { EasePanelKeyV2 } from './ease/constants/panel_keys';
import {
  VulnerabilityFindingsPanelKeyV2,
  VulnerabilityFindingsPreviewPanelKeyV2,
} from './csp_details/vulnerabilities_flyout/constants';
import { FindingsVulnerabilityPanel } from './csp_details/vulnerabilities_flyout/vulnerabilities_right';
import { UpsellingProvider } from '../common/components/upselling_provider';
import { ReactQueryClientProvider } from '../common/containers/query_client/query_client_provider';
import { DiscoverInTimelineContextProvider } from '../common/components/discover_in_timeline/provider';
import { AssistantProvider } from '../assistant/provider';
import { CaseProvider } from '../cases/components/provider/provider';
import { ConsoleManager } from '../management/components/console';

const GraphGroupedNodePreviewPanel = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphGroupedNodePreviewPanel,
  }))
);

/**
 * Flyout used for the Security Solution application
 * We keep the default EUI 1001 z-index to ensure it is always rendered behind Timeline (which has a z-index of 1002)
 * We propagate the onClose callback to the rest of Security Solution using a window event 'expandable-flyout-on-close-SecuritySolution'
 * This flyout support push/overlay mode. The value is saved in local storage.
 */
export const SecuritySolutionFlyoutV2 = memo(() => {
  const services = useKibana().services;
  const { overlays, uiActions, upselling } = services;
  const store = getStore();

  const FlyoutProviders = ({ children }) => (
    <KibanaContextProvider services={services}>
      <EuiThemeProvider>
        <NavigationProvider core={services}>
          <UpsellingProvider upsellingService={upselling}>
            <ReduxProvider store={store}>
              <ReactQueryClientProvider>
                <CellActionsProvider
                  getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
                >
                  <DiscoverInTimelineContextProvider>
                    <AssistantProvider>
                      <CaseProvider>
                        <ConsoleManager>
                          <HashRouter>{children}</HashRouter>
                        </ConsoleManager>
                      </CaseProvider>
                    </AssistantProvider>
                  </DiscoverInTimelineContextProvider>
                </CellActionsProvider>
              </ReactQueryClientProvider>
            </ReduxProvider>
          </UpsellingProvider>
        </NavigationProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );

  const flyoutDocumentsPanels: FlyoutProps['registeredPanels'] = [
    {
      key: DocumentDetailsRightPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <RightPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsLeftPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <LeftPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsPreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <PreviewPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsAlertReasonPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <AlertReasonPanelProvider {...(props as AlertReasonPanelProps).params}>
            <AlertReasonPanel />
          </AlertReasonPanelProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: GraphGroupedNodePreviewPanelKey,
      component: (props) => {
        // TODO Fix typing issue here
        const params = props.params as unknown as GraphGroupedNodePreviewPanelProps;
        return (
          <FlyoutProviders>
            <GraphGroupedNodePreviewPanel {...params} />
          </FlyoutProviders>
        );
      },
    },
    {
      key: RulePanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <RulePanel {...(props as RulePanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: RulePreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <RulePanel {...(props as RulePanelExpandableFlyoutProps).params} isPreviewMode />
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsIsolateHostPanelKeyV2,
      component: (props) => (
        <IsolateHostPanelProvider {...(props as IsolateHostPanelProps).params}>
          <IsolateHostPanel path={props.path as IsolateHostPanelProps['path']} />
        </IsolateHostPanelProvider>
      ),
    },
    {
      key: DocumentDetailsMainAnalyzerPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <AnalyzerMainPanel {...(props as DocumentDetailsProps['path']).params} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsAnalyzerPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <AnalyzerPanel {...(props as AnalyzerPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsMainSessionViewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <SessionViewMainPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsSessionViewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <SessionViewPanelProvider {...(props as SessionViewPanelProps).params}>
            <SessionViewPanel path={props.path as SessionViewPanelProps['path']} />
          </SessionViewPanelProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: UserPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <UserPanel {...(props as UserPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: UserDetailsPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <UserDetailsPanel {...(props as UserDetailsExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: UserPreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <UserPanel {...(props as UserPanelExpandableFlyoutProps).params} isPreviewMode />
        </FlyoutProviders>
      ),
    },
    {
      key: HostPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <HostPanel {...(props as HostPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: HostDetailsPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <HostDetailsPanel {...(props as HostDetailsExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: HostPreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <HostPanel {...(props as HostPanelExpandableFlyoutProps).params} isPreviewMode />
        </FlyoutProviders>
      ),
    },
    {
      key: NetworkPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <NetworkPanel {...(props as NetworkExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: NetworkPreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <NetworkPanel {...(props as NetworkExpandableFlyoutProps).params} isPreviewMode />
        </FlyoutProviders>
      ),
    },

    {
      key: ServicePanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <ServicePanel {...(props as ServicePanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: ServiceDetailsPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <ServiceDetailsPanel {...(props as ServiceDetailsExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: GenericEntityPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <GenericEntityPanel {...(props as GenericEntityPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: GenericEntityDetailsPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <GenericEntityDetailsPanel
            {...(props as GenericEntityDetailsExpandableFlyoutProps).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: MisconfigurationFindingsPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <FindingsMisconfigurationPanel
            {...(props as FindingsMisconfigurationPanelExpandableFlyoutPropsNonPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: EasePanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <EaseDetailsProvider {...(props as EaseDetailsProps).params}>
            <EasePanel />
          </EaseDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: MisconfigurationFindingsPreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <FindingsMisconfigurationPanel
            {...(props as FindingsMisconfigurationPanelExpandableFlyoutPropsPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: VulnerabilityFindingsPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <FindingsVulnerabilityPanel
            {...(props as FindingsVulnerabilityPanelExpandableFlyoutPropsNonPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: VulnerabilityFindingsPreviewPanelKeyV2,
      component: (props) => (
        <FlyoutProviders>
          <FindingsVulnerabilityPanel
            {...(props as FindingsVulnerabilityPanelExpandableFlyoutPropsPreview).params}
          />
        </FlyoutProviders>
      ),
    },
  ];

  return <Flyout overlays={overlays} registeredPanels={flyoutDocumentsPanels} />;
});

SecuritySolutionFlyoutV2.displayName = 'SecuritySolutionFlyoutV2';
