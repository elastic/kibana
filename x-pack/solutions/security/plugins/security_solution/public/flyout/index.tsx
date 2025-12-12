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
import type { FlyoutProps } from '@kbn/flyout';
import { Flyout } from '@kbn/flyout';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { Provider as ReduxProvider } from 'react-redux';
import { CellActionsProvider } from '@kbn/cell-actions';
import { HashRouter } from 'react-router-dom';
import { InvestigationGuidePanel } from './document_details/investigation_guide';
import { ResponsePanel } from './document_details/response';
import { NotesPanel } from './document_details/notes';
import { InsightsPanel } from './document_details/insights';
import { getStore } from '../common/store';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { SessionViewMainPanel } from './document_details/session_view';
import { AnalyzerMainPanel } from './document_details/analyzer';
import type { GenericEntityDetailsExpandableFlyoutProps } from './entity_details/generic_details_left';
import {
  GenericEntityDetailsPanel,
  GenericEntityDetailsPanelKey,
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
import { NetworkPanel, NetworkPanelKey, NetworkPreviewPanelKey } from './network_details';
import {
  DocumentDetailsAlertReasonPanelKey,
  DocumentDetailsAnalyzerPanelKey,
  DocumentDetailsInsightsPanelKey,
  DocumentDetailsInvestigationGuidePanelKey,
  DocumentDetailsIsolateHostPanelKey,
  DocumentDetailsMainAnalyzerPanelKey,
  DocumentDetailsMainSessionViewPanelKey,
  DocumentDetailsNotesPanelKey,
  DocumentDetailsPreviewPanelKey,
  DocumentDetailsResponsePanelKey,
  DocumentDetailsRightPanelKey,
  DocumentDetailsSessionViewPanelKey,
} from './document_details/shared/constants/panel_keys';
import type { IsolateHostPanelProps } from './document_details/isolate_host';
import { IsolateHostPanel } from './document_details/isolate_host';
import { IsolateHostPanelProvider } from './document_details/isolate_host/context';
import type { DocumentDetailsProps } from './document_details/shared/types';
import { DocumentDetailsProvider } from './document_details/shared/context';
import { RightPanel } from './document_details/right';
import type { AlertReasonPanelProps } from './document_details/alert_reason';
import { AlertReasonPanel } from './document_details/alert_reason';
import { AlertReasonPanelProvider } from './document_details/alert_reason/context';
import type { RulePanelExpandableFlyoutProps } from './rule_details/right';
import { RulePanel, RulePanelKey, RulePreviewPanelKey } from './rule_details/right';
import type { UserPanelExpandableFlyoutProps } from './entity_details/user_right';
import { UserPanel, UserPreviewPanelKey } from './entity_details/user_right';
import type { UserDetailsExpandableFlyoutProps } from './entity_details/user_details_left';
import { UserDetailsPanel, UserDetailsPanelKey } from './entity_details/user_details_left';
import type { HostPanelExpandableFlyoutProps } from './entity_details/host_right';
import { HostPanel, HostPreviewPanelKey } from './entity_details/host_right';
import type { HostDetailsExpandableFlyoutProps } from './entity_details/host_details_left';
import { HostDetailsPanel, HostDetailsPanelKey } from './entity_details/host_details_left';
import type { AnalyzerPanelExpandableFlyoutProps } from './document_details/analyzer_panels';
import { AnalyzerPanel } from './document_details/analyzer_panels';
import {
  GenericEntityPanelKey,
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from './entity_details/shared/constants';
import type { ServicePanelExpandableFlyoutProps } from './entity_details/service_right';
import { ServicePanel } from './entity_details/service_right';
import type { ServiceDetailsExpandableFlyoutProps } from './entity_details/service_details_left';
import { ServiceDetailsPanel, ServiceDetailsPanelKey } from './entity_details/service_details_left';
import {
  MisconfigurationFindingsPanelKey,
  MisconfigurationFindingsPreviewPanelKey,
} from './csp_details/findings_flyout/constants';
import { FindingsMisconfigurationPanel } from './csp_details/findings_flyout/findings_right';
import { EasePanelKey } from './ease/constants/panel_keys';
import {
  VulnerabilityFindingsPanelKey,
  VulnerabilityFindingsPreviewPanelKey,
} from './csp_details/vulnerabilities_flyout/constants';
import { FindingsVulnerabilityPanel } from './csp_details/vulnerabilities_flyout/vulnerabilities_right';
import { UpsellingProvider } from '../common/components/upselling_provider';
import { ReactQueryClientProvider } from '../common/containers/query_client/query_client_provider';
import { DiscoverInTimelineContextProvider } from '../common/components/discover_in_timeline/provider';
import { AssistantProvider } from '../assistant/provider';
import { CaseProvider } from '../cases/components/provider/provider';
import { ConsoleManager } from '../management/components/console';
import { AttackDetailsRightPanelKey } from './attack_details/constants/panel_keys';
import type { AttackDetailsProps } from './attack_details/types';
import { AttackDetailsProvider } from './attack_details/context';
import { AttackDetailsPanel } from './attack_details';
import type { IOCDetailsProps } from './ioc_details/types';
import { IOCDetailsProvider } from './ioc_details/context';
import { IOCPanel } from './ioc_details';
import { IOCRightPanelKey } from './ioc_details/constants/panel_keys';

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
export const SecuritySolutionFlyout = memo(() => {
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
      key: DocumentDetailsRightPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <RightPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsPreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <RightPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsAlertReasonPanelKey,
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
      key: RulePanelKey,
      component: (props) => (
        <FlyoutProviders>
          <RulePanel {...(props as RulePanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: RulePreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <RulePanel {...(props as RulePanelExpandableFlyoutProps).params} isChild />
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsIsolateHostPanelKey,
      component: (props) => (
        <IsolateHostPanelProvider {...(props as IsolateHostPanelProps).params}>
          <IsolateHostPanel path={props.path as IsolateHostPanelProps['path']} />
        </IsolateHostPanelProvider>
      ),
    },
    {
      key: DocumentDetailsMainAnalyzerPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <AnalyzerMainPanel {...(props as DocumentDetailsProps['path']).params} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsAnalyzerPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <AnalyzerPanel {...(props as AnalyzerPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsMainSessionViewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <SessionViewMainPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsSessionViewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <SessionViewPanelProvider {...(props as SessionViewPanelProps).params}>
            <SessionViewPanel path={props.path as SessionViewPanelProps['path']} />
          </SessionViewPanelProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsInsightsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <InsightsPanel path={props.path as DocumentDetailsProps['path']} />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsNotesPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <NotesPanel />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsResponsePanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <ResponsePanel />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: DocumentDetailsInvestigationGuidePanelKey,
      component: (props) => (
        <FlyoutProviders>
          <DocumentDetailsProvider {...(props as DocumentDetailsProps).params}>
            <InvestigationGuidePanel />
          </DocumentDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: UserPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <UserPanel {...(props as UserPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: UserDetailsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <UserDetailsPanel {...(props as UserDetailsExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: UserPreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <UserPanel {...(props as UserPanelExpandableFlyoutProps).params} isChild />
        </FlyoutProviders>
      ),
    },
    {
      key: HostPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <HostPanel {...(props as HostPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: HostDetailsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <HostDetailsPanel {...(props as HostDetailsExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: HostPreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <HostPanel {...(props as HostPanelExpandableFlyoutProps).params} isChild />
        </FlyoutProviders>
      ),
    },
    {
      key: NetworkPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <NetworkPanel {...(props as NetworkExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: NetworkPreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <NetworkPanel {...(props as NetworkExpandableFlyoutProps).params} isChild />
        </FlyoutProviders>
      ),
    },

    {
      key: ServicePanelKey,
      component: (props) => (
        <FlyoutProviders>
          <ServicePanel {...(props as ServicePanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: ServiceDetailsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <ServiceDetailsPanel {...(props as ServiceDetailsExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: GenericEntityPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <GenericEntityPanel {...(props as GenericEntityPanelExpandableFlyoutProps).params} />
        </FlyoutProviders>
      ),
    },
    {
      key: GenericEntityDetailsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <GenericEntityDetailsPanel
            {...(props as GenericEntityDetailsExpandableFlyoutProps).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: MisconfigurationFindingsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <FindingsMisconfigurationPanel
            {...(props as FindingsMisconfigurationPanelExpandableFlyoutPropsNonPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: EasePanelKey,
      component: (props) => (
        <FlyoutProviders>
          <EaseDetailsProvider {...(props as EaseDetailsProps).params}>
            <EasePanel />
          </EaseDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: AttackDetailsRightPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <AttackDetailsProvider {...(props as AttackDetailsProps).params}>
            <AttackDetailsPanel path={props.path as AttackDetailsProps['path']} />
          </AttackDetailsProvider>
        </FlyoutProviders>
      ),
    },
    {
      key: MisconfigurationFindingsPreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <FindingsMisconfigurationPanel
            {...(props as FindingsMisconfigurationPanelExpandableFlyoutPropsPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: VulnerabilityFindingsPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <FindingsVulnerabilityPanel
            {...(props as FindingsVulnerabilityPanelExpandableFlyoutPropsNonPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: VulnerabilityFindingsPreviewPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <FindingsVulnerabilityPanel
            {...(props as FindingsVulnerabilityPanelExpandableFlyoutPropsPreview).params}
          />
        </FlyoutProviders>
      ),
    },
    {
      key: IOCRightPanelKey,
      component: (props) => (
        <FlyoutProviders>
          <IOCDetailsProvider {...(props as IOCDetailsProps).params}>
            <IOCPanel path={props.path as IOCDetailsProps['path']} />
          </IOCDetailsProvider>
        </FlyoutProviders>
      ),
    },
  ];

  return <Flyout overlays={overlays} registeredPanels={flyoutDocumentsPanels} />;
});

SecuritySolutionFlyout.displayName = 'SecuritySolutionFlyout';
