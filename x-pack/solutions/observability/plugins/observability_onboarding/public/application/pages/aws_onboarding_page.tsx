/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiStep,
  EuiSteps,
  EuiSuperSelect,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  type EuiSuperSelectOption,
  euiFontSize,
  transparentize,
  useEuiScrollBar,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from './template';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';
import { INTEGRATION_HEADER_LOGO_FRAME_PX, IntegrationHeader } from '../header/integration_header';
import { SECTIONS } from './ingest_hub/ingest_hub_data';
import { AWS_SERVICES, type AwsService } from './ingest_hub/aws_services_data';
import { useActiveVersion } from '../version_switcher_widget';
const AWS_TILE = SECTIONS.flatMap((s) => s.tiles).find((t) => t.id === 'aws');

/** Prototype delay before showing a successful connection (replace with real validation). */
const AWS_ACCOUNT_CONNECT_MOCK_DELAY_MS = 1200;
/** Prototype delay for AWS service discovery after successful connection (Version 2). */
const AWS_SERVICE_DISCOVERY_MOCK_DELAY_MS = 1200;

/** Mock service IDs "discovered" after a successful AWS connection (Version 2 prototype). */
const AWS_MOCK_DETECTED_SERVICE_IDS: readonly string[] = [
  'amazon_ec2',
  'amazon_rds',
  'aws_lambda',
  'aws_cloudwatch',
];

const ELASTIC_LOGOS = 'https://raw.githubusercontent.com/elastic/integrations/main/packages';

/** Step 1 — how Elastic authenticates to AWS (drives which credential fields are shown). */
type AwsAuthMethodId = 'federated_identity' | 'direct_access_keys' | 'temporary_keys';

const AWS_AUTH_METHOD_ORDER: readonly AwsAuthMethodId[] = [
  'federated_identity',
  'direct_access_keys',
  'temporary_keys',
] as const;

function awsAuthMethodTitle(id: AwsAuthMethodId): string {
  switch (id) {
    case 'federated_identity':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.step1.authMethod.federatedTitle',
        {
          defaultMessage: 'Federated Identity',
        }
      );
    case 'direct_access_keys':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.step1.authMethod.directKeysTitle',
        {
          defaultMessage: 'Direct Access Keys',
        }
      );
    case 'temporary_keys':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.step1.authMethod.temporaryKeysTitle',
        {
          defaultMessage: 'Temporary Keys',
        }
      );
    default:
      return id;
  }
}

function awsAuthMethodDescription(id: AwsAuthMethodId): string {
  switch (id) {
    case 'federated_identity':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.step1.authMethod.federatedDesc',
        {
          defaultMessage:
            'Elastic assumes an IAM role in your account. Best for production and least-privilege access.',
        }
      );
    case 'direct_access_keys':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.step1.authMethod.directKeysDesc',
        {
          defaultMessage:
            'Long-lived access key ID and secret. Use only when a federated role is not possible.',
        }
      );
    case 'temporary_keys':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.step1.authMethod.temporaryKeysDesc',
        {
          defaultMessage:
            'Short-lived credentials from STS (access key, secret, and session token). Ideal for local or CI workflows.',
        }
      );
    default:
      return '';
  }
}

const AWS_AUTH_METHOD_SUPER_SELECT_OPTIONS: Array<EuiSuperSelectOption<AwsAuthMethodId>> =
  AWS_AUTH_METHOD_ORDER.map((methodId) => ({
    value: methodId,
    'data-test-subj': `awsOnboardingStep1AuthMethod--${methodId}`,
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <strong>{awsAuthMethodTitle(methodId)}</strong>
        </EuiFlexItem>
        {methodId === 'federated_identity' ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent">
              {i18n.translate(
                'xpack.observabilityOnboarding.awsPage.step1.authMethod.recommendedBadge',
                {
                  defaultMessage: 'Recommended',
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <strong>{awsAuthMethodTitle(methodId)}</strong>
          </EuiFlexItem>
          {methodId === 'federated_identity' ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.step1.authMethod.recommendedBadge',
                  {
                    defaultMessage: 'Recommended',
                  }
                )}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p style={{ margin: 0 }}>{awsAuthMethodDescription(methodId)}</p>
        </EuiText>
      </>
    ),
  }));

/** How the AWS integration runs in the customer environment (deployment step). */
type AwsDeploymentMethodId = 'agentless' | 'agent_based' | 'cloud_forwarder' | 'firehose';

function awsDeploymentSelectionProfile(manualServiceIds: ReadonlySet<string>): {
  hasLogs: boolean;
  hasMetrics: boolean;
} {
  const ids = [...manualServiceIds];
  return {
    hasLogs: ids.some((id) => AWS_LOGS_SERVICE_ID_SET.has(id)),
    hasMetrics: ids.some((id) => !AWS_LOGS_SERVICE_ID_SET.has(id)),
  };
}

function awsDeploymentMethodIdsForSelection(params: {
  hasLogs: boolean;
  hasMetrics: boolean;
}): AwsDeploymentMethodId[] {
  const { hasLogs, hasMetrics } = params;
  if (hasLogs && !hasMetrics) {
    return ['cloud_forwarder'];
  }
  if (!hasLogs && hasMetrics) {
    return ['agentless', 'firehose', 'agent_based'];
  }
  if (hasLogs && hasMetrics) {
    return ['cloud_forwarder', 'agentless', 'firehose', 'agent_based'];
  }
  return ['agentless'];
}

function recommendedAwsDeploymentMethod(params: {
  hasLogs: boolean;
  hasMetrics: boolean;
}): AwsDeploymentMethodId {
  const { hasLogs, hasMetrics } = params;
  if (hasLogs && !hasMetrics) {
    return 'cloud_forwarder';
  }
  if (!hasLogs && hasMetrics) {
    return 'agentless';
  }
  if (hasLogs && hasMetrics) {
    return 'cloud_forwarder';
  }
  return 'agentless';
}

function awsDeploymentMethodTitle(id: AwsDeploymentMethodId): string {
  switch (id) {
    case 'agentless':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.agentlessTitle', {
        defaultMessage: 'Agentless',
      });
    case 'agent_based':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.agentBasedTitle', {
        defaultMessage: 'Agent-based',
      });
    case 'cloud_forwarder':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderTitle',
        {
          defaultMessage: 'EDOT Cloud Forwarder',
        }
      );
    case 'firehose':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.firehoseTitle', {
        defaultMessage: 'Amazon Data Firehose',
      });
    default:
      return id;
  }
}

function awsDeploymentMethodDescription(id: AwsDeploymentMethodId): string {
  switch (id) {
    case 'agentless':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.agentlessDescription',
        {
          defaultMessage: 'Set up the integration without an agent.',
        }
      );
    case 'agent_based':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.agentBasedDescription',
        {
          defaultMessage: 'Deploy an Elastic Agent into your cloud environment.',
        }
      );
    case 'cloud_forwarder':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderDescription',
        {
          defaultMessage:
            'Lambda function plus CloudFormation: forwards supported AWS logs to Elastic’s managed OTLP endpoint—no agents or VPC plumbing.',
        }
      );
    case 'firehose':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.firehoseDescription',
        {
          defaultMessage:
            'Stream high-volume metrics and telemetry through Firehose when agentless collection is not an option.',
        }
      );
    default:
      return '';
  }
}

function buildAwsDeploymentSuperSelectOptions(
  methodIds: readonly AwsDeploymentMethodId[],
  recommendedId: AwsDeploymentMethodId | null
): Array<EuiSuperSelectOption<AwsDeploymentMethodId>> {
  return methodIds.map((methodId) => ({
    value: methodId,
    'data-test-subj': `awsOnboardingDeploymentMethodOption--${methodId}`,
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <strong>{awsDeploymentMethodTitle(methodId)}</strong>
        </EuiFlexItem>
        {recommendedId === methodId ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent">
              {i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.recommendedBadge', {
                defaultMessage: 'Recommended',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <strong>{awsDeploymentMethodTitle(methodId)}</strong>
          </EuiFlexItem>
          {recommendedId === methodId ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.recommendedBadge',
                  {
                    defaultMessage: 'Recommended',
                  }
                )}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p style={{ margin: 0 }}>{awsDeploymentMethodDescription(methodId)}</p>
        </EuiText>
      </>
    ),
  }));
}

/** Scope for the Configure integration step (AWS Organization vs single account). */
type AwsIntegrationAccountScopeId = 'organization' | 'single_account';

const AWS_INTEGRATION_ACCOUNT_SCOPE_ORDER: readonly AwsIntegrationAccountScopeId[] = [
  'organization',
  'single_account',
] as const;

function integrationAccountScopeTitle(id: AwsIntegrationAccountScopeId): string {
  switch (id) {
    case 'organization':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.configureIntegration.accountScope.organizationTitle',
        {
          defaultMessage: 'AWS Organization',
        }
      );
    case 'single_account':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.configureIntegration.accountScope.singleAccountTitle',
        {
          defaultMessage: 'Single Account',
        }
      );
    default:
      return id;
  }
}

function integrationAccountScopeDescription(id: AwsIntegrationAccountScopeId): string {
  switch (id) {
    case 'organization':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.configureIntegration.accountScope.organizationDesc',
        {
          defaultMessage:
            'Connect Elastic to every AWS account (current and future) in your environment by giving Elastic read-only configuration access to your AWS organization.',
        }
      );
    case 'single_account':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.configureIntegration.accountScope.singleAccountDesc',
        {
          defaultMessage:
            'Use a single account for a quick POC. Choose organization scope to cover every account—including new ones—automatically.',
        }
      );
    default:
      return '';
  }
}

const AWS_INTEGRATION_ACCOUNT_SCOPE_SUPER_SELECT_OPTIONS: Array<
  EuiSuperSelectOption<AwsIntegrationAccountScopeId>
> = AWS_INTEGRATION_ACCOUNT_SCOPE_ORDER.map((scopeId) => ({
  value: scopeId,
  'data-test-subj': `awsOnboardingConnectAccountScopeOption--${scopeId}`,
  inputDisplay: <strong>{integrationAccountScopeTitle(scopeId)}</strong>,
  dropdownDisplay: (
    <>
      <strong>{integrationAccountScopeTitle(scopeId)}</strong>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p style={{ margin: 0 }}>{integrationAccountScopeDescription(scopeId)}</p>
      </EuiText>
    </>
  ),
}));

/** `itemClassName` on AWS onboarding `EuiSuperSelect` menus — removes context-menu underline over custom rows. */
const AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME = 'awsOnboardingSuperSelectMenuItem';

const awsOnboardingSuperSelectMenuItemGlobalCss = css`
  .${AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}.euiContextMenuItem:where(a, button):not(
      :disabled
    ):hover,
  .${AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}.euiContextMenuItem:where(a, button):not(
      :disabled
    ):focus {
    text-decoration: none !important;
  }
`;

const DOC_FLEET_DATA_STREAMS = 'https://www.elastic.co/guide/en/fleet/current/data-streams.html';

/** Opens AWS CloudFormation quick create; pair with Elastic’s AWS monitoring guide for the template URL. */
const AWS_CLOUDFORMATION_QUICK_CREATE_HREF =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate';

type AwsFederatedIdentityTabId = 'new_identity' | 'existing_identity';

const serviceMap = new Map(AWS_SERVICES.map((s) => [s.id, s]));

/** AWS integrations that ingest as log pipelines (EDOT Cloud Forwarder–appropriate). */
const AWS_LOGS_TAB_SERVICE_IDS: readonly string[] = [
  // CloudWatch is handled as a metrics-first, agentless path (CloudWatch Metrics API); not EDOT CF.
  'custom_aws_logs',
  'amazon_vpc',
  'aws_route53',
  'aws_config',
  'aws_firewall',
  'amazon_natgateway',
  'aws_transit_gateway',
  'amazon_vpn',
];

const AWS_LOGS_SERVICE_ID_SET: ReadonlySet<string> = new Set(AWS_LOGS_TAB_SERVICE_IDS);

const AWS_EDOT_CLOUD_FORWARDER_DOC_HREF =
  'https://www.elastic.co/docs/reference/opentelemetry/edot-cloud-forwarder/aws';

const AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL =
  'https://elastic-cloudformation.s3.amazonaws.com/firehose.yaml';

function awsFirehoseConsoleQuickCreateHref(): string {
  const query = new URLSearchParams({
    templateURL: AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL,
    stackName: 'elastic-firehose',
  });
  return `https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?${query.toString()}`;
}

type AwsFirehoseSetupPathId = 'console' | 'cli';

type AwsAgentBasedHostTargetId = 'new_hosts' | 'existing_hosts';

const AWS_AGENT_BASED_MOCK_POLICY_SELECT_OPTIONS: Array<{ value: string; text: string }> = [
  {
    value: '',
    text: 'Select a policy…',
  },
  {
    value: 'agent-policy-1',
    text: 'Agent policy 1 (3 agents)',
  },
  {
    value: 'agent-policy-2',
    text: 'Agent policy 2 (1 agent)',
  },
];

// ─── Shared layout primitives (Kubernetes onboarding patterns) ─────────────

const LogoBadge: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 32,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }}
      />
    </div>
  );
};

/** Child of `awsIntentGoalCardsGridCss`: span the full grid width (deployment / connect rows). */
const awsIntentGridFullWidthCellCss = css`
  grid-column: 1 / -1;
  min-width: 0;
`;

/** Two-column grid: ~12 checkable cards visible before scrolling (8 ≈ 360px). */
const AWS_SERVICE_GRID_SCROLL_HEIGHT_PX = 540;

/** Scroll region with top/bottom fades only when there is overflow in that direction. */
const AwsServicePickerScrollArea: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const scrollBarCss = useEuiScrollBar();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edgeShadows, setEdgeShadows] = useState({ top: false, bottom: false });

  const syncEdgeShadows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const epsilon = 2;
    if (scrollHeight <= clientHeight + epsilon) {
      setEdgeShadows({ top: false, bottom: false });
      return;
    }
    setEdgeShadows({
      top: scrollTop > epsilon,
      bottom: scrollTop + clientHeight < scrollHeight - epsilon,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncEdgeShadows();
    const onScroll = () => syncEdgeShadows();
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(syncEdgeShadows);
    });
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) {
      ro.observe(inner);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', syncEdgeShadows);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', syncEdgeShadows);
    };
  }, [syncEdgeShadows]);

  const edge = transparentize(euiTheme.colors.emptyShade, 0.72);
  const edgeMid = transparentize(euiTheme.colors.emptyShade, 0.34);
  const fadeHeight = `calc(${euiTheme.size.xl} + ${euiTheme.size.xl} + ${euiTheme.size.l} + ${euiTheme.size.m} + ${euiTheme.size.m} + ${euiTheme.size.s})`;
  const borderClearance = euiTheme.border.width.thin;
  /** Pull fades slightly past the scroll box so the edge softening covers outer borders. */
  const fadeOutsetInline = `calc(-1 * ${euiTheme.size.xs})`;

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <div
        aria-hidden
        css={css`
          pointer-events: none;
          position: absolute;
          inset-inline: ${fadeOutsetInline};
          top: 0;
          height: ${fadeHeight};
          z-index: 2;
          opacity: ${edgeShadows.top ? 1 : 0};
          transition: opacity ${euiTheme.animation.fast} ease-out;
          background: linear-gradient(to bottom, ${edge} 0%, ${edgeMid} 38%, transparent 85%);
        `}
      />
      <div
        aria-hidden
        css={css`
          pointer-events: none;
          position: absolute;
          inset-inline: ${fadeOutsetInline};
          bottom: ${borderClearance};
          height: ${fadeHeight};
          z-index: 2;
          opacity: ${edgeShadows.bottom ? 1 : 0};
          transition: opacity ${euiTheme.animation.fast} ease-out;
          background: linear-gradient(to top, ${edge} 0%, ${edgeMid} 38%, transparent 85%);
        `}
      />
      <div
        ref={scrollRef}
        tabIndex={0}
        data-test-subj="awsOnboardingStep2ServiceGridScroll"
        css={css`
          ${scrollBarCss}
          max-height: ${AWS_SERVICE_GRID_SCROLL_HEIGHT_PX}px;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          &:focus {
            outline: none;
          }
        `}
      >
        {children}
      </div>
    </div>
  );
};

const checkableCardCss = css`
  & [class*='euiCheckableCard__label'] {
    margin-bottom: -16px !important;
  }
  p {
    margin: 0;
  }
  .awsOnboardingServiceCardDescription {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }
`;

type AwsServiceBrowseGroupId = 'all' | 'logs' | 'metrics';

const AWS_SERVICE_BROWSE_GROUP_ORDER: readonly AwsServiceBrowseGroupId[] = [
  'all',
  'logs',
  'metrics',
];

function awsBrowseGroupTitle(id: AwsServiceBrowseGroupId): string {
  switch (id) {
    case 'all':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.browseGroup.all', {
        defaultMessage: 'All',
      });
    case 'logs':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.browseGroup.logs', {
        defaultMessage: 'Logs',
      });
    case 'metrics':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.browseGroup.metrics', {
        defaultMessage: 'Metrics',
      });
    default:
      return id;
  }
}

function servicesForBrowseGroup(groupId: AwsServiceBrowseGroupId): AwsService[] {
  if (groupId === 'all') {
    return [...AWS_SERVICES].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (groupId === 'logs') {
    return AWS_LOGS_TAB_SERVICE_IDS.filter((sid) => serviceMap.has(sid)).map(
      (sid) => serviceMap.get(sid)!
    );
  }
  return [...AWS_SERVICES]
    .filter((svc) => !AWS_LOGS_SERVICE_ID_SET.has(svc.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function orderBrowseServicesWithSelectionFirst(
  services: readonly AwsService[],
  manualServiceIds: ReadonlySet<string>
): AwsService[] {
  const selected = services.filter((s) => manualServiceIds.has(s.id));
  const unselected = services.filter((s) => !manualServiceIds.has(s.id));
  return [...selected, ...unselected];
}

interface AwsCloudForwarderLogSource {
  id: string;
  bucket: string;
  logType: string;
  region: string;
}

const AWS_CLOUD_FORWARDER_LOG_TYPE_SUPER_SELECT_OPTIONS: Array<EuiSuperSelectOption<string>> = [
  {
    value: 'cloudtrail',
    'data-test-subj': 'awsOnboardingCloudForwarderLogTypeOption--cloudtrail',
    inputDisplay: 'CloudTrail',
    dropdownDisplay: 'CloudTrail',
  },
  {
    value: 'vpc_flow',
    'data-test-subj': 'awsOnboardingCloudForwarderLogTypeOption--vpc_flow',
    inputDisplay: 'VPC Flow Logs',
    dropdownDisplay: 'VPC Flow Logs',
  },
  {
    value: 's3_access',
    'data-test-subj': 'awsOnboardingCloudForwarderLogTypeOption--s3_access',
    inputDisplay: 'S3 access logs',
    dropdownDisplay: 'S3 access logs',
  },
  {
    value: 'elb',
    'data-test-subj': 'awsOnboardingCloudForwarderLogTypeOption--elb',
    inputDisplay: 'ELB access logs',
    dropdownDisplay: 'ELB access logs',
  },
  {
    value: 'waf',
    'data-test-subj': 'awsOnboardingCloudForwarderLogTypeOption--waf',
    inputDisplay: 'WAF logs',
    dropdownDisplay: 'WAF logs',
  },
  {
    value: 'other',
    'data-test-subj': 'awsOnboardingCloudForwarderLogTypeOption--other',
    inputDisplay: 'Other',
    dropdownDisplay: 'Other',
  },
];

const AWS_CLOUD_FORWARDER_REGION_OPTIONS: Array<{ value: string; text: string }> = [
  { value: 'us-east-1', text: 'us-east-1 (N. Virginia)' },
  { value: 'us-east-2', text: 'us-east-2 (Ohio)' },
  { value: 'us-west-1', text: 'us-west-1 (N. California)' },
  { value: 'us-west-2', text: 'us-west-2 (Oregon)' },
  { value: 'eu-west-1', text: 'eu-west-1 (Ireland)' },
  { value: 'eu-central-1', text: 'eu-central-1 (Frankfurt)' },
  { value: 'ap-southeast-1', text: 'ap-southeast-1 (Singapore)' },
  { value: 'ap-northeast-1', text: 'ap-northeast-1 (Tokyo)' },
];

const AwsCloudForwarderLogSourcesPanel: React.FC<{
  sources: AwsCloudForwarderLogSource[];
  onSourcesChange: (next: AwsCloudForwarderLogSource[]) => void;
}> = ({ sources, onSourcesChange }) => {
  const updateSource = (id: string, patch: Partial<AwsCloudForwarderLogSource>) => {
    onSourcesChange(sources.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addSource = () => {
    onSourcesChange([
      ...sources,
      {
        id: `cf-src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        bucket: '',
        logType: '',
        region: 'us-east-1',
      },
    ]);
  };

  const removeSource = (id: string) => {
    onSourcesChange(sources.filter((s) => s.id !== id));
  };

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        data-test-subj="awsOnboardingCloudForwarderIntroCallout"
        title={i18n.translate(
          'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.calloutTitle',
          {
            defaultMessage: 'EDOT Cloud Forwarder',
          }
        )}
        color="primary"
        iconType="documentation"
      >
        <p style={{ margin: '0 0 8px' }}>
          {i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.calloutBody',
            {
              defaultMessage:
                'A Lambda + CloudFormation stack that forwards supported AWS logs from S3 to Elastic’s OTLP endpoint — no agents or VPC wiring. You’ll deploy the stack in the next step.',
            }
          )}{' '}
          <EuiLink
            href={AWS_EDOT_CLOUD_FORWARDER_DOC_HREF}
            target="_blank"
            external
            data-test-subj="awsOnboardingCloudForwarderUiDocLink"
          >
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.calloutDocLink',
              {
                defaultMessage: 'Docs',
              }
            )}
          </EuiLink>
        </p>
        <p style={{ margin: 0 }}>
          {i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.calloutPrerequisites',
            {
              defaultMessage:
                'Prerequisites: an S3 bucket containing your logs and permissions to create CloudFormation stacks and Lambda functions.',
            }
          )}
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <div data-test-subj="awsOnboardingCloudForwarderLogSourcesPanel">
        <EuiTitle size="xxs">
          <h3 style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.logSourcesTitle',
              {
                defaultMessage: 'Log sources',
              }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.logSourcesIntro1',
              {
                defaultMessage:
                  'One entry per S3 bucket. Add multiple sources if your logs are split across buckets or regions.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {sources.map((source, index) => (
          <React.Fragment key={source.id}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <EuiPanel
              hasBorder
              paddingSize="m"
              data-test-subj={`awsOnboardingCloudForwarderLogSource-${index}`}
            >
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                justifyContent="spaceBetween"
                responsive={false}
              >
                <EuiFlexItem
                  grow={true}
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiTitle size="xxs">
                    <h4 style={{ margin: 0 }}>
                      {i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.logSourceHeading',
                        {
                          defaultMessage: 'Log source {index}',
                          values: { index: index + 1 },
                        }
                      )}
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
                {index > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      display="base"
                      size="xs"
                      color="danger"
                      iconType="trash"
                      onClick={() => removeSource(source.id)}
                      aria-label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.removeLogSource',
                        {
                          defaultMessage: 'Remove log source',
                        }
                      )}
                      data-test-subj={`awsOnboardingCloudForwarderRemoveLogSource-${index}`}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="m" responsive>
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.bucketLabel',
                      {
                        defaultMessage: 'S3 bucket name',
                      }
                    )}
                  >
                    <EuiFieldText
                      fullWidth
                      value={source.bucket}
                      onChange={(e) => updateSource(source.id, { bucket: e.target.value })}
                      placeholder="my-logs-bucket"
                      autoComplete="off"
                      spellCheck={false}
                      data-test-subj={`awsOnboardingCloudForwarderBucket-${index}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.logTypeLabel',
                      {
                        defaultMessage: 'Log type',
                      }
                    )}
                  >
                    <EuiSuperSelect
                      fullWidth
                      itemClassName={AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}
                      options={AWS_CLOUD_FORWARDER_LOG_TYPE_SUPER_SELECT_OPTIONS}
                      valueOfSelected={source.logType || undefined}
                      onChange={(value) => updateSource(source.id, { logType: value })}
                      placeholder={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.logTypePlaceholder',
                        {
                          defaultMessage: 'Select type…',
                        }
                      )}
                      data-test-subj={`awsOnboardingCloudForwarderLogType-${index}`}
                      popoverProps={{ repositionOnScroll: true }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.regionLabel',
                  {
                    defaultMessage: 'AWS region',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.regionHelp',
                  {
                    defaultMessage: 'Must match the region where your S3 bucket is located.',
                  }
                )}
              >
                <EuiSelect
                  fullWidth
                  options={AWS_CLOUD_FORWARDER_REGION_OPTIONS}
                  value={source.region}
                  onChange={(e) => updateSource(source.id, { region: e.target.value })}
                  data-test-subj={`awsOnboardingCloudForwarderRegion-${index}`}
                />
              </EuiFormRow>
            </EuiPanel>
          </React.Fragment>
        ))}
        <EuiSpacer size="m" />
        <EuiButton
          size="s"
          iconType="plusInCircle"
          onClick={addSource}
          data-test-subj="awsOnboardingCloudForwarderAddLogSource"
        >
          {i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderUi.addAnother',
            {
              defaultMessage: 'Add log source',
            }
          )}
        </EuiButton>
      </div>
    </>
  );
};

const AwsFirehoseSetupPanel: React.FC<{
  setupPath: AwsFirehoseSetupPathId;
  onSetupPathChange: (path: AwsFirehoseSetupPathId) => void;
  elasticEndpoint: string;
  onElasticEndpointChange: (value: string) => void;
}> = ({ setupPath, onSetupPathChange, elasticEndpoint, onElasticEndpointChange }) => {
  const firehoseCliCommand = useMemo(() => {
    const endpointValue = elasticEndpoint.trim() || 'YOUR_ENDPOINT';
    return [
      'aws cloudformation create-stack \\',
      '  --stack-name elastic-firehose \\',
      `  --template-url ${AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL} \\`,
      '  --capabilities CAPABILITY_IAM \\',
      `  --parameters ParameterKey=ElasticEndpoint,ParameterValue=${endpointValue}`,
    ].join('\n');
  }, [elasticEndpoint]);

  return (
    <>
      <EuiSpacer size="m" />
      <div data-test-subj="awsOnboardingFirehoseSetupPanel">
        <EuiTitle size="xxs">
          <h3 style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.createStreamTitle',
              {
                defaultMessage: 'Create a Firehose delivery stream',
              }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.stackDescription',
              {
                defaultMessage:
                  'The stack will include a Firehose delivery stream, backup S3 bucket, CloudWatch subscription filter, metrics stream, and necessary IAM roles.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.elasticEndpointLabel',
            {
              defaultMessage: 'Elastic ingestion endpoint',
            }
          )}
          helpText={i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.elasticEndpointHelp',
            {
              defaultMessage:
                'Used in the CloudFormation parameters and CLI example below. Paste the OTLP or Elastic endpoint from your deployment.',
            }
          )}
        >
          <EuiFieldText
            fullWidth
            value={elasticEndpoint}
            onChange={(e) => onElasticEndpointChange(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
            spellCheck={false}
            data-test-subj="awsOnboardingFirehoseElasticEndpoint"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.setupMethodLegend',
            {
              defaultMessage: 'How to create the stack',
            }
          )}
          buttonSize="compressed"
          idSelected={setupPath}
          onChange={(id) => onSetupPathChange(id as AwsFirehoseSetupPathId)}
          options={[
            {
              id: 'console',
              label: i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.viaConsole',
                {
                  defaultMessage: 'Via AWS Console',
                }
              ),
            },
            {
              id: 'cli',
              label: i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.viaCli',
                {
                  defaultMessage: 'Via AWS CLI',
                }
              ),
            },
          ]}
          data-test-subj="awsOnboardingFirehoseSetupMethod"
        />
        <EuiSpacer size="m" />
        {setupPath === 'console' ? (
          <>
            <EuiText size="s" color="subdued">
              <p style={{ margin: 0 }}>
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.consoleInstructions',
                  {
                    defaultMessage:
                      'Click the button below to create a CloudFormation stack from our template. Keep this page open and return once you’ve submitted the form in AWS Console.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink
              href={AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL}
              target="_blank"
              external
              data-test-subj="awsOnboardingFirehoseDownloadTemplateLink"
            >
              {i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.downloadTemplate',
                {
                  defaultMessage: 'Download the CloudFormation template',
                }
              )}
            </EuiLink>
            <EuiSpacer size="m" />
            <EuiButton
              color="primary"
              fill
              iconType="launch"
              iconSide="left"
              href={awsFirehoseConsoleQuickCreateHref()}
              target="_blank"
              data-test-subj="awsOnboardingFirehoseCreateInAwsButton"
            >
              {i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.createInAws',
                {
                  defaultMessage: 'Create Firehose stream in AWS',
                }
              )}
            </EuiButton>
          </>
        ) : (
          <>
            <EuiText size="s" color="subdued">
              <p style={{ margin: 0 }}>
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.cliInstructions',
                  {
                    defaultMessage: 'Run this command to deploy the CloudFormation stack via CLI:',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder={false} paddingSize="s" color="subdued">
              <EuiCodeBlock
                language="bash"
                fontSize="s"
                paddingSize="m"
                isCopyable
                data-test-subj="awsOnboardingFirehoseCliCommand"
              >
                {firehoseCliCommand}
              </EuiCodeBlock>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiLink
              href={AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL}
              target="_blank"
              external
              data-test-subj="awsOnboardingFirehoseDownloadTemplateCliLink"
            >
              {i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.firehoseUi.downloadTemplateForIac',
                {
                  defaultMessage:
                    'Download the template to modify default settings for your IaC setup.',
                }
              )}
            </EuiLink>
          </>
        )}
      </div>
    </>
  );
};

const AwsAgentBasedSetupPanel: React.FC<{
  hostTarget: AwsAgentBasedHostTargetId;
  onHostTargetChange: (value: AwsAgentBasedHostTargetId) => void;
  newPolicyName: string;
  onNewPolicyNameChange: (value: string) => void;
  collectSystemLogs: boolean;
  onCollectSystemLogsChange: (checked: boolean) => void;
  existingPolicyId: string;
  onExistingPolicyIdChange: (value: string) => void;
}> = ({
  hostTarget,
  onHostTargetChange,
  newPolicyName,
  onNewPolicyNameChange,
  collectSystemLogs,
  onCollectSystemLogsChange,
  existingPolicyId,
  onExistingPolicyIdChange,
}) => {
  const collectSystemLogsCheckboxId = useGeneratedHtmlId({ prefix: 'awsAgentBasedCollectSystem' });

  return (
    <>
      <EuiSpacer size="m" />
      <div data-test-subj="awsOnboardingAgentBasedSetupPanel">
        <EuiTitle size="xxs">
          <h3 style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.whereTitle',
              {
                defaultMessage: 'Where to add this integration?',
              }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.whereIntro',
              {
                defaultMessage:
                  'Choose an agent policy to attach this integration to. You’ll install the Elastic Agent in the next step.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.hostTargetLegend',
            {
              defaultMessage: 'Policy target',
            }
          )}
          buttonSize="compressed"
          idSelected={hostTarget}
          onChange={(id) => onHostTargetChange(id as AwsAgentBasedHostTargetId)}
          options={[
            {
              id: 'new_hosts',
              label: i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.newHosts',
                {
                  defaultMessage: 'New hosts',
                }
              ),
            },
            {
              id: 'existing_hosts',
              label: i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.existingHosts',
                {
                  defaultMessage: 'Existing hosts',
                }
              ),
            },
          ]}
          data-test-subj="awsOnboardingAgentBasedHostTarget"
        />
        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="s" />
        <EuiSpacer size="m" />
        {hostTarget === 'new_hosts' ? (
          <EuiFlexGroup alignItems="flexStart" gutterSize="l" responsive>
            <EuiFlexItem grow={true}>
              <EuiTitle size="xxs">
                <h4 style={{ margin: 0 }}>
                  {i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.createPolicyTitle',
                    {
                      defaultMessage: 'Create agent policy',
                    }
                  )}
                </h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p style={{ margin: 0 }}>
                  {i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.createPolicyBody',
                    {
                      defaultMessage:
                        'Add this integration to a new set of hosts by creating a new agent policy. You can add the agent in the next step.',
                    }
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.newPolicyNameLabel',
                  {
                    defaultMessage: 'New agent policy name',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  value={newPolicyName}
                  onChange={(e) => onNewPolicyNameChange(e.target.value)}
                  placeholder={i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.newPolicyNamePlaceholder',
                    {
                      defaultMessage: 'Agent policy 1',
                    }
                  )}
                  autoComplete="off"
                  spellCheck={false}
                  data-test-subj="awsOnboardingAgentBasedNewPolicyName"
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiCheckbox
                id={collectSystemLogsCheckboxId}
                checked={collectSystemLogs}
                onChange={(e) => onCollectSystemLogsChange(e.target.checked)}
                data-test-subj="awsOnboardingAgentBasedCollectSystemLogs"
                label={
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
                    <EuiFlexItem grow={false}>
                      <span>
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.collectSystemLabel',
                          {
                            defaultMessage: 'Collect system logs and metrics',
                          }
                        )}
                      </span>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="iInCircle" size="s" color="subdued" aria-hidden={true} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiTitle size="xxs">
              <h4 style={{ margin: 0 }}>
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.selectPolicyTitle',
                  {
                    defaultMessage: 'Select agent policy',
                  }
                )}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.selectPolicyFieldLabel',
                {
                  defaultMessage: 'Agent policy',
                }
              )}
              helpText={i18n.translate(
                'xpack.observabilityOnboarding.awsPage.deployment.agentBasedUi.selectPolicyHelp',
                {
                  defaultMessage:
                    'The integration will be added to all agents enrolled in this policy.',
                }
              )}
            >
              <EuiSelect
                fullWidth
                options={AWS_AGENT_BASED_MOCK_POLICY_SELECT_OPTIONS}
                value={existingPolicyId}
                onChange={(e) => onExistingPolicyIdChange(e.target.value)}
                data-test-subj="awsOnboardingAgentBasedExistingPolicy"
              />
            </EuiFormRow>
          </>
        )}
      </div>
    </>
  );
};

export const AwsOnboardingPage: React.FC = () => {
  const tile = AWS_TILE;
  const displayName =
    tile?.name ??
    i18n.translate('xpack.observabilityOnboarding.awsPage.fallbackTitle', {
      defaultMessage: 'Amazon Web Services',
    });
  const subtitle =
    tile?.description ??
    i18n.translate('xpack.observabilityOnboarding.awsPage.fallbackSubtitle', {
      defaultMessage: 'Collect logs and metrics from AWS services.',
    });

  useFlowBreadcrumb({ text: displayName });

  const [activeVersion] = useActiveVersion();
  const isAwsVersion1Wizard = activeVersion === 'version1';
  const isAwsVersion2Wizard = activeVersion === 'version2';
  const [awsVersion1StepIndex, setAwsVersion1StepIndex] = useState(0);
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const awsVersion1SidebarStepsCss = useMemo(
    () => css`
      /*
       * Center step numbers on the IntegrationHeader logo frame (same restrictWidth column; logo
       * is the first flex item). EuiStep titleSize="xs" uses a circle of size.l.
       */
      padding-inline-start: max(
        0px,
        calc(${INTEGRATION_HEADER_LOGO_FRAME_PX / 2}px - (${euiTheme.size.l} / 2))
      );
      padding-inline-end: 0;
      overflow: visible;

      .euiStep__content {
        display: none !important;
        margin-block-start: 0 !important;
        margin-block-end: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
      }

      /* Extend each step so the built-in ::before connector has vertical room (was ~44px). */
      .euiStep:not(:last-of-type) {
        padding-block-end: 16px;
      }

      .euiStep:not(:last-of-type)::before {
        border-left-color: ${euiTheme.colors.borderBaseSubdued};
      }
    `,
    [euiTheme]
  );

  const stepsCss = useMemo(
    () => css`
      margin-left: 16px;
      .euiStep__titleWrapper {
        align-items: center;
      }
      /*
       * EUI applies transform: scale(1.1) to the "current" step number, which shifts it relative to
       * completed steps. Reset so all indicators line up on the vertical rail.
       */
      .euiStep .euiStepNumber {
        transform: none !important;
      }
      /*
       * Only style top-level wizard steps (direct .euiStep children). Nested EuiSteps inside a
       * step body (e.g. federated identity) must keep EUI spacing—otherwise our padding stacks with
       * EUI’s default bottom padding (~40px) and doubles the gap before the next main step.
       */
      & > .euiStep > .euiStep__content {
        margin-block-start: 0 !important;
        margin-inline-start: calc(${euiTheme.size.xl} / 2) !important;
        padding-block-start: 0 !important;
        padding-inline-start: calc(${euiTheme.size.xl} / 2 + ${euiTheme.size.base}) !important;
        padding-inline-end: 0 !important;
        /* Remove bottom padding from the main step content block. */
        padding-block-end: 0 !important;
      }
      & > .euiStep > .euiStep__titleWrapper .euiStep__title {
        padding-block-start: 0;
      }
    `,
    [euiTheme]
  );
  const docIamRole = 'https://www.elastic.co/guide/en/observability/current/monitor-aws.html';

  const [iamRoleArn, setIamRoleArn] = useState('');
  const [awsFederatedIdentityTab, setAwsFederatedIdentityTab] =
    useState<AwsFederatedIdentityTabId>('new_identity');
  const [awsFederatedIdentityName, setAwsFederatedIdentityName] = useState('');
  const [awsExternalId, setAwsExternalId] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsAccountConnectionStatus, setAwsAccountConnectionStatus] = useState<
    'idle' | 'loading' | 'success'
  >('idle');
  const [awsServiceDiscoveryStatus, setAwsServiceDiscoveryStatus] = useState<
    'idle' | 'loading' | 'complete'
  >('idle');
  const [awsAuthMethod, setAwsAuthMethod] = useState<AwsAuthMethodId>('federated_identity');
  const [awsServiceBrowseGroup, setAwsServiceBrowseGroup] =
    useState<AwsServiceBrowseGroupId>('all');
  const [awsBrowseServiceSearch, setAwsBrowseServiceSearch] = useState('');
  const [manualServiceIds, setManualServiceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [awsIntegrationAccountScope, setAwsIntegrationAccountScope] =
    useState<AwsIntegrationAccountScopeId>('organization');
  const [awsIntegrationName, setAwsIntegrationName] = useState('');
  const [awsIntegrationDescription, setAwsIntegrationDescription] = useState('');
  const [awsIntegrationNamespace, setAwsIntegrationNamespace] = useState('default');
  const [awsDeploymentMethod, setAwsDeploymentMethod] =
    useState<AwsDeploymentMethodId>('agentless');
  const [cloudForwarderLogSources, setCloudForwarderLogSources] = useState<
    AwsCloudForwarderLogSource[]
  >(() => [
    {
      id: 'cf-src-initial',
      bucket: '',
      logType: '',
      region: 'us-east-1',
    },
  ]);
  const [awsFirehoseSetupPath, setAwsFirehoseSetupPath] =
    useState<AwsFirehoseSetupPathId>('console');
  const [awsFirehoseElasticEndpoint, setAwsFirehoseElasticEndpoint] = useState('');
  const [awsAgentBasedHostTarget, setAwsAgentBasedHostTarget] =
    useState<AwsAgentBasedHostTargetId>('new_hosts');
  const [awsAgentBasedNewPolicyName, setAwsAgentBasedNewPolicyName] = useState('');
  const [awsAgentBasedCollectSystemLogs, setAwsAgentBasedCollectSystemLogs] = useState(true);
  const [awsAgentBasedExistingPolicyId, setAwsAgentBasedExistingPolicyId] = useState('');
  const awsIntegrationAdvancedAccordionId = useGeneratedHtmlId({
    prefix: 'awsIntegrationAdvanced',
  });

  const awsDeploymentProfile = useMemo(
    () => awsDeploymentSelectionProfile(manualServiceIds),
    [manualServiceIds]
  );
  const awsDeploymentMethodIds = useMemo(
    () => awsDeploymentMethodIdsForSelection(awsDeploymentProfile),
    [awsDeploymentProfile]
  );
  const awsDeploymentRecommended = useMemo(
    () => recommendedAwsDeploymentMethod(awsDeploymentProfile),
    [awsDeploymentProfile]
  );
  const awsDeploymentSuperSelectOptions = useMemo(
    () => buildAwsDeploymentSuperSelectOptions(awsDeploymentMethodIds, awsDeploymentRecommended),
    [awsDeploymentMethodIds, awsDeploymentRecommended]
  );

  const resolvedAwsDeploymentMethod = useMemo(
    () =>
      awsDeploymentMethodIds.includes(awsDeploymentMethod)
        ? awsDeploymentMethod
        : awsDeploymentRecommended,
    [awsDeploymentMethod, awsDeploymentMethodIds, awsDeploymentRecommended]
  );

  useEffect(() => {
    setAwsDeploymentMethod((prev) =>
      awsDeploymentMethodIds.includes(prev) ? prev : awsDeploymentRecommended
    );
  }, [awsDeploymentMethodIds, awsDeploymentRecommended]);

  const toggleManualService = (id: string) => {
    setManualServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasRoleCredentials = Boolean(iamRoleArn.trim());
  const hasExternalId = Boolean(awsExternalId.trim());
  const hasFederatedNewIdentityComplete = Boolean(
    awsFederatedIdentityName.trim() && hasRoleCredentials && hasExternalId
  );
  const hasFederatedExistingIdentityComplete = Boolean(hasRoleCredentials && hasExternalId);
  const hasAccessKeyCredentials = Boolean(awsAccessKeyId.trim() && awsSecretAccessKey.trim());
  const hasTemporaryCredentials = Boolean(
    awsAccessKeyId.trim() && awsSecretAccessKey.trim() && awsSessionToken.trim()
  );
  const canContinueStep1 =
    awsAuthMethod === 'federated_identity'
      ? awsFederatedIdentityTab === 'new_identity'
        ? hasFederatedNewIdentityComplete
        : hasFederatedExistingIdentityComplete
      : awsAuthMethod === 'direct_access_keys'
      ? hasAccessKeyCredentials
      : hasTemporaryCredentials;

  const handleConnectAccount = useCallback(async () => {
    if (!canContinueStep1) {
      return;
    }
    setAwsAccountConnectionStatus('loading');
    if (isAwsVersion2Wizard) {
      setAwsServiceDiscoveryStatus('idle');
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, AWS_ACCOUNT_CONNECT_MOCK_DELAY_MS);
    });
    setAwsAccountConnectionStatus('success');
  }, [canContinueStep1, isAwsVersion2Wizard]);

  useEffect(() => {
    setAwsAccountConnectionStatus('idle');
    setAwsServiceDiscoveryStatus('idle');
  }, [
    iamRoleArn,
    awsExternalId,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsSessionToken,
    awsAuthMethod,
    awsFederatedIdentityTab,
    awsFederatedIdentityName,
  ]);

  useEffect(() => {
    if (isAwsVersion1Wizard && awsVersion1StepIndex !== 2) {
      setAwsAccountConnectionStatus('idle');
    }
  }, [isAwsVersion1Wizard, awsVersion1StepIndex]);

  const canContinueAwsVersion1Monitor = manualServiceIds.size > 0;
  const canContinueAwsVersion1Configure = Boolean(awsIntegrationName.trim());

  const canContinueAwsVersion1Deployment = useMemo(() => {
    if (resolvedAwsDeploymentMethod === 'cloud_forwarder') {
      return (
        cloudForwarderLogSources.length > 0 &&
        cloudForwarderLogSources.every(
          (source) => source.bucket.trim().length > 0 && source.logType.trim().length > 0
        )
      );
    }
    if (resolvedAwsDeploymentMethod === 'firehose') {
      return awsFirehoseElasticEndpoint.trim().length > 0;
    }
    if (resolvedAwsDeploymentMethod === 'agent_based') {
      if (awsAgentBasedHostTarget === 'new_hosts') {
        return awsAgentBasedNewPolicyName.trim().length > 0;
      }
      return awsAgentBasedExistingPolicyId.trim().length > 0;
    }
    return true;
  }, [
    resolvedAwsDeploymentMethod,
    cloudForwarderLogSources,
    awsFirehoseElasticEndpoint,
    awsAgentBasedHostTarget,
    awsAgentBasedNewPolicyName,
    awsAgentBasedExistingPolicyId,
  ]);

  useEffect(() => {
    setAwsVersion1StepIndex(0);
    setAwsServiceBrowseGroup('all');
    setAwsBrowseServiceSearch('');
    setAwsAccountConnectionStatus('idle');
    setAwsServiceDiscoveryStatus('idle');
    setManualServiceIds(new Set());
  }, [activeVersion]);

  useEffect(() => {
    if (!isAwsVersion2Wizard || awsAccountConnectionStatus !== 'success') {
      setAwsServiceDiscoveryStatus('idle');
      return;
    }
    setAwsServiceDiscoveryStatus('loading');
    const timeout = setTimeout(() => {
      const next = new Set<string>();
      for (const id of AWS_MOCK_DETECTED_SERVICE_IDS) {
        if (serviceMap.has(id)) {
          next.add(id);
        }
      }
      setManualServiceIds(next);
      setAwsServiceDiscoveryStatus('complete');
    }, AWS_SERVICE_DISCOVERY_MOCK_DELAY_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [awsAccountConnectionStatus, isAwsVersion2Wizard]);

  const servicesInActiveBrowseGroup = useMemo(
    () => servicesForBrowseGroup(awsServiceBrowseGroup),
    [awsServiceBrowseGroup]
  );

  const browseGroupFilteredServices = useMemo(() => {
    const q = awsBrowseServiceSearch.trim().toLowerCase();
    if (!q) {
      return servicesInActiveBrowseGroup;
    }
    return servicesInActiveBrowseGroup.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
    );
  }, [servicesInActiveBrowseGroup, awsBrowseServiceSearch]);

  const allBrowseGroupFilteredSelected = useMemo(
    () =>
      browseGroupFilteredServices.length > 0 &&
      browseGroupFilteredServices.every((s) => manualServiceIds.has(s.id)),
    [browseGroupFilteredServices, manualServiceIds]
  );

  const browseGroupServicesDisplayOrder = useMemo(
    () => orderBrowseServicesWithSelectionFirst(browseGroupFilteredServices, manualServiceIds),
    [browseGroupFilteredServices, manualServiceIds]
  );

  const awsServicePickerGridCss = useMemo(
    () =>
      css`
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: ${euiTheme.size.s};
        @media (max-width: ${euiTheme.breakpoint.m}px) {
          grid-template-columns: 1fr;
        }
      `,
    [euiTheme.breakpoint.m, euiTheme.size.s]
  );

  /** Two-column goal-card layout (monitoring step); deployment/connect/configure reuse the same grid width. */
  const awsIntentGoalCardsGridCss = useMemo(
    () => css`
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: ${euiTheme.size.m};
      @media (max-width: ${euiTheme.breakpoint.m}px) {
        grid-template-columns: 1fr;
      }
    `,
    [euiTheme.breakpoint.m, euiTheme.size.m]
  );

  /** Fills the app chrome so the column divider can run to the bottom when step content is short. */
  const awsVersion1WizardChromeShellCss = useMemo(
    () => css`
      display: flex;
      flex-direction: column;
      /* ~integration header + PageTemplate section block padding (40+40); tune if chrome shifts. */
      min-block-size: max(360px, calc(100dvh - var(--euiFixedHeadersOffset, 0px) - 280px));
    `,
    []
  );

  const awsVersion1WizardFlexRowCss = useMemo(
    () => css`
      flex: 1;
      min-height: 0;
    `,
    []
  );

  const { awsWizardStepPanels } = useMemo(() => {
    const stepPanels: Array<{ title: string; body: React.ReactNode }> = [
      {
        title: isAwsVersion1Wizard
          ? i18n.translate(
              'xpack.observabilityOnboarding.awsPage.version1Wizard.selectAwsServicesTitle',
              {
                defaultMessage: 'Select services',
              }
            )
          : i18n.translate('xpack.observabilityOnboarding.awsPage.step2.title', {
              defaultMessage: 'Select services',
            }),
        body: (
          <>
            <EuiButtonGroup
              data-test-subj="awsOnboardingServiceBrowseGroup"
              legend={i18n.translate(
                'xpack.observabilityOnboarding.awsPage.step2.browseGroupLegend',
                {
                  defaultMessage: 'Browse AWS integrations by category',
                }
              )}
              buttonSize="compressed"
              idSelected={awsServiceBrowseGroup}
              onChange={(id) => setAwsServiceBrowseGroup(id as AwsServiceBrowseGroupId)}
              options={AWS_SERVICE_BROWSE_GROUP_ORDER.map((groupId) => ({
                id: groupId,
                label: awsBrowseGroupTitle(groupId),
              }))}
            />
            <EuiSpacer size="m" />
            <div data-test-subj="awsOnboardingStep2IndividualServicesPanel">
              <EuiFieldSearch
                data-test-subj="observabilityOnboardingStepsFieldSearch"
                fullWidth
                placeholder={i18n.translate('xpack.observabilityOnboarding.awsPage.step2.search', {
                  defaultMessage: 'Search AWS services…',
                })}
                value={awsBrowseServiceSearch}
                onChange={(e) => setAwsBrowseServiceSearch(e.target.value)}
              />
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={true}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.observabilityOnboarding.awsPage.step2.listHeader', {
                      defaultMessage:
                        '{count, plural, one {# service selected} other {# services selected}}',
                      values: { count: manualServiceIds.size },
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="observabilityOnboardingStepsSelectAllVisibleButton"
                    size="xs"
                    disabled={browseGroupFilteredServices.length === 0}
                    onClick={() => {
                      setManualServiceIds((prev) => {
                        const next = new Set(prev);
                        const allVisibleSelected =
                          browseGroupFilteredServices.length > 0 &&
                          browseGroupFilteredServices.every((s) => next.has(s.id));
                        if (allVisibleSelected) {
                          for (const svc of browseGroupFilteredServices) {
                            next.delete(svc.id);
                          }
                        } else {
                          for (const svc of browseGroupFilteredServices) {
                            next.add(svc.id);
                          }
                        }
                        return next;
                      });
                    }}
                  >
                    {allBrowseGroupFilteredSelected
                      ? i18n.translate('xpack.observabilityOnboarding.awsPage.step2.deselectAll', {
                          defaultMessage: 'Deselect all',
                        })
                      : i18n.translate('xpack.observabilityOnboarding.awsPage.step2.selectAll', {
                          defaultMessage: 'Select all',
                        })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <AwsServicePickerScrollArea>
                <div css={awsServicePickerGridCss}>
                  {browseGroupServicesDisplayOrder.map((svc) => {
                    const checked = manualServiceIds.has(svc.id);
                    return (
                      <EuiCheckableCard
                        key={svc.id}
                        id={`pwr-${svc.id}`}
                        checkableType="checkbox"
                        checked={checked}
                        onChange={() => toggleManualService(svc.id)}
                        css={checkableCardCss}
                        label={
                          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <LogoBadge src={svc.logoUrl} alt="" size={26} />
                            </EuiFlexItem>
                            <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                              <strong>{svc.name}</strong>
                              <EuiText size="xs" color="subdued" style={{ marginTop: 4 }}>
                                <p className="awsOnboardingServiceCardDescription">
                                  {svc.description}
                                </p>
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        }
                      />
                    );
                  })}
                </div>
              </AwsServicePickerScrollArea>
            </div>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.title', {
          defaultMessage: 'Deployment',
        }),
        body: (
          <>
            {awsDeploymentProfile.hasLogs && resolvedAwsDeploymentMethod !== 'cloud_forwarder' ? (
              <>
                <EuiCallOut
                  data-test-subj="awsOnboardingDeploymentLogsCallout"
                  title={i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.deployment.logsCalloutTitle',
                    {
                      defaultMessage: 'Log sources: EDOT Cloud Forwarder',
                    }
                  )}
                  color="primary"
                  iconType="documentation"
                >
                  <p style={{ margin: '0 0 8px' }}>
                    {i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.deployment.logsCalloutBody',
                      {
                        defaultMessage:
                          'Elastic’s EDOT Cloud Forwarder for AWS is a Lambda plus CloudFormation stack that sends supported AWS logs to Elastic’s managed OTLP endpoint—no agents or VPC wiring. Choose OpenTelemetry or ECS mode to match how data should land.',
                      }
                    )}
                  </p>
                  <EuiLink
                    href={AWS_EDOT_CLOUD_FORWARDER_DOC_HREF}
                    target="_blank"
                    external
                    data-test-subj="awsOnboardingDeploymentEdotCfDocLink"
                  >
                    {i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.deployment.logsCalloutDocLink',
                      {
                        defaultMessage: 'EDOT Cloud Forwarder for AWS documentation',
                      }
                    )}
                  </EuiLink>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            ) : null}
            {awsDeploymentProfile.hasLogs && awsDeploymentProfile.hasMetrics ? (
              <>
                <EuiText size="s" color="subdued">
                  <p style={{ margin: 0 }}>
                    {i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.deployment.mixedSelectionNote',
                      {
                        defaultMessage:
                          'You selected both log and metric sources. You may need more than one deployment path in AWS—start with the option below, then add the other as a follow-on stack if needed.',
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
              </>
            ) : null}
            {!(
              awsDeploymentMethodIds.length === 1 &&
              resolvedAwsDeploymentMethod === 'cloud_forwarder'
            ) ? (
              <div css={awsIntentGoalCardsGridCss}>
                <div css={awsIntentGridFullWidthCellCss}>
                  <div data-test-subj="awsOnboardingDeploymentMethod">
                    <EuiFormRow
                      fullWidth
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.deployment.methodLabel',
                        {
                          defaultMessage: 'Deployment method',
                        }
                      )}
                    >
                      {awsDeploymentMethodIds.length > 1 ? (
                        <EuiSuperSelect
                          hasDividers
                          fullWidth
                          itemClassName={AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}
                          data-test-subj="awsOnboardingDeploymentMethodSuperSelect"
                          options={awsDeploymentSuperSelectOptions}
                          valueOfSelected={resolvedAwsDeploymentMethod}
                          onChange={(value) => {
                            setAwsDeploymentMethod(value);
                          }}
                          popoverProps={{ repositionOnScroll: true }}
                        />
                      ) : (
                        <EuiPanel
                          data-test-subj="awsOnboardingDeploymentMethodSingle"
                          paddingSize="m"
                          hasBorder={true}
                          color="subdued"
                        >
                          <EuiTitle size="xxs">
                            <h3 style={{ margin: 0 }}>
                              {awsDeploymentMethodTitle(resolvedAwsDeploymentMethod)}
                            </h3>
                          </EuiTitle>
                          <EuiSpacer size="xs" />
                          <EuiText size="xs" color="subdued">
                            <p style={{ margin: 0 }}>
                              {awsDeploymentMethodDescription(resolvedAwsDeploymentMethod)}
                            </p>
                          </EuiText>
                        </EuiPanel>
                      )}
                    </EuiFormRow>
                    {awsDeploymentMethodIds.length > 1 ? (
                      <>
                        <EuiSpacer size="s" />
                        <EuiText size="xs" color="subdued">
                          <p style={{ margin: 0 }}>
                            {awsDeploymentMethodDescription(resolvedAwsDeploymentMethod)}
                          </p>
                        </EuiText>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {resolvedAwsDeploymentMethod === 'cloud_forwarder' ? (
              <AwsCloudForwarderLogSourcesPanel
                sources={cloudForwarderLogSources}
                onSourcesChange={setCloudForwarderLogSources}
              />
            ) : null}
            {resolvedAwsDeploymentMethod === 'firehose' ? (
              <AwsFirehoseSetupPanel
                setupPath={awsFirehoseSetupPath}
                onSetupPathChange={setAwsFirehoseSetupPath}
                elasticEndpoint={awsFirehoseElasticEndpoint}
                onElasticEndpointChange={setAwsFirehoseElasticEndpoint}
              />
            ) : null}
            {resolvedAwsDeploymentMethod === 'agent_based' ? (
              <AwsAgentBasedSetupPanel
                hostTarget={awsAgentBasedHostTarget}
                onHostTargetChange={setAwsAgentBasedHostTarget}
                newPolicyName={awsAgentBasedNewPolicyName}
                onNewPolicyNameChange={setAwsAgentBasedNewPolicyName}
                collectSystemLogs={awsAgentBasedCollectSystemLogs}
                onCollectSystemLogsChange={setAwsAgentBasedCollectSystemLogs}
                existingPolicyId={awsAgentBasedExistingPolicyId}
                onExistingPolicyIdChange={setAwsAgentBasedExistingPolicyId}
              />
            ) : null}
          </>
        ),
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.step1.title', {
          defaultMessage: 'Connect account',
        }),
        body: (
          <>
            <div
              data-test-subj="awsOnboardingConnectAccountFormLayout"
              css={css`
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: ${euiTheme.size.l};
                align-items: start;
                min-width: 0;
                .euiFormRow {
                  row-gap: ${euiTheme.size.s};
                }
              `}
            >
              <div data-test-subj="awsOnboardingConnectAccountScope">
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.configureIntegration.accountTypeLabel',
                    {
                      defaultMessage: 'Account type',
                    }
                  )}
                >
                  <EuiSuperSelect
                    hasDividers
                    fullWidth
                    itemClassName={AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}
                    data-test-subj="awsOnboardingConnectAccountScopeSuperSelect"
                    options={AWS_INTEGRATION_ACCOUNT_SCOPE_SUPER_SELECT_OPTIONS}
                    valueOfSelected={awsIntegrationAccountScope}
                    onChange={(value) => {
                      setAwsIntegrationAccountScope(value);
                    }}
                    popoverProps={{ repositionOnScroll: true }}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiText size="xs" color="subdued">
                  <p style={{ margin: 0 }}>
                    {integrationAccountScopeDescription(awsIntegrationAccountScope)}
                  </p>
                </EuiText>
              </div>
              <div data-test-subj="awsOnboardingStep1PreferredMethod">
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.step1.authMethod.superSelectLabel',
                    {
                      defaultMessage: 'Authentication method',
                    }
                  )}
                >
                  <EuiSuperSelect
                    hasDividers
                    fullWidth
                    itemClassName={AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}
                    data-test-subj="awsOnboardingStep1AuthMethodSuperSelect"
                    options={AWS_AUTH_METHOD_SUPER_SELECT_OPTIONS}
                    valueOfSelected={awsAuthMethod}
                    onChange={(value) => {
                      setAwsAuthMethod(value);
                    }}
                    popoverProps={{ repositionOnScroll: true }}
                  />
                </EuiFormRow>
              </div>
              <div css={awsIntentGridFullWidthCellCss}>
                {awsAuthMethod === 'federated_identity' ? (
                  <div
                    data-test-subj="awsOnboardingFederatedIdentityCard"
                    css={css`
                      text-align: start;
                      padding-block: ${euiTheme.size.m};
                      .euiFormHelpText {
                        text-align: start;
                      }
                      /*
                       * EuiSteps (titleSize xxs): 16px under the title row; align body with title text
                       * (step number width + titleWrapper gap). !important wins over EUI content insets.
                       */
                      .euiStep__content {
                        margin-block-start: 0 !important;
                        padding-block-start: ${euiTheme.size.base} !important;
                        margin-inline-start: 0 !important;
                        padding-inline-start: calc(
                          ${euiTheme.size.base} + ${euiTheme.size.base}
                        ) !important;
                      }
                    `}
                  >
                    <EuiTabs data-test-subj="awsOnboardingFederatedIdentityTabs">
                      <EuiTab
                        isSelected={awsFederatedIdentityTab === 'new_identity'}
                        onClick={() => setAwsFederatedIdentityTab('new_identity')}
                      >
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.step1.federated.tabNewIdentity',
                          {
                            defaultMessage: 'New identity',
                          }
                        )}
                      </EuiTab>
                      <EuiTab
                        isSelected={awsFederatedIdentityTab === 'existing_identity'}
                        onClick={() => setAwsFederatedIdentityTab('existing_identity')}
                      >
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.step1.federated.tabExistingIdentity',
                          {
                            defaultMessage: 'Existing identity',
                          }
                        )}
                      </EuiTab>
                    </EuiTabs>
                    <EuiSpacer size="l" />
                    {awsFederatedIdentityTab === 'new_identity' ? (
                      <>
                        <EuiSteps
                          data-test-subj="awsOnboardingFederatedNewIdentitySteps"
                          headingElement="h3"
                          titleSize="xxs"
                          steps={[
                            {
                              'data-test-subj': 'awsOnboardingFederatedCloudFormationStep',
                              title: i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.federated.cloudFormationStepTitle',
                                {
                                  defaultMessage: 'Create your IAM role with CloudFormation',
                                }
                              ),
                              children: (
                                <>
                                  <EuiText size="s" color="subdued" component="div">
                                    <p style={{ margin: 0 }}>
                                      {i18n.translate(
                                        'xpack.observabilityOnboarding.awsPage.step1.federated.cloudFormationShortDescription',
                                        {
                                          defaultMessage:
                                            'Open the template in the right AWS account and Region, finish the stack, then copy the Role ARN and External ID from Outputs.',
                                        }
                                      )}{' '}
                                      <EuiLink
                                        data-test-subj="awsOnboardingFederatedIdentityLearnMoreLink"
                                        href={docIamRole}
                                        target="_blank"
                                        external
                                      >
                                        {i18n.translate(
                                          'xpack.observabilityOnboarding.awsPage.step1.federated.learnMore',
                                          {
                                            defaultMessage: 'Learn more',
                                          }
                                        )}
                                      </EuiLink>
                                    </p>
                                  </EuiText>
                                  <EuiSpacer size="m" />
                                  <EuiFlexGroup
                                    alignItems="flexStart"
                                    justifyContent="flexStart"
                                    gutterSize="none"
                                    responsive={false}
                                  >
                                    <EuiFlexItem grow={false}>
                                      <EuiButton
                                        data-test-subj="awsOnboardingFederatedLaunchCloudFormationButton"
                                        iconType="launch"
                                        iconSide="left"
                                        color="primary"
                                        href={AWS_CLOUDFORMATION_QUICK_CREATE_HREF}
                                        target="_blank"
                                      >
                                        {i18n.translate(
                                          'xpack.observabilityOnboarding.awsPage.step1.launchCloudFormation',
                                          {
                                            defaultMessage: 'Launch CloudFormation',
                                          }
                                        )}
                                      </EuiButton>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </>
                              ),
                            },
                            {
                              'data-test-subj': 'awsOnboardingFederatedIdentityInputsStep',
                              title: i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.federated.identityInputsStepTitle',
                                {
                                  defaultMessage: 'Enter your connection details',
                                }
                              ),
                              children: (
                                <>
                                  <EuiFormRow
                                    fullWidth
                                    label={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.federated.identityNameLabel',
                                      {
                                        defaultMessage: 'Federated identity name',
                                      }
                                    )}
                                  >
                                    <EuiFieldText
                                      data-test-subj="awsOnboardingFederatedIdentityName"
                                      fullWidth
                                      value={awsFederatedIdentityName}
                                      onChange={(e) => setAwsFederatedIdentityName(e.target.value)}
                                      placeholder={i18n.translate(
                                        'xpack.observabilityOnboarding.awsPage.step1.federated.identityNamePlaceholder',
                                        {
                                          defaultMessage: 'e.g. production-aws-readonly',
                                        }
                                      )}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                  </EuiFormRow>
                                  <EuiSpacer size="l" />
                                  <EuiFormRow
                                    label={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.federated.roleArnLabel',
                                      {
                                        defaultMessage: 'Role ARN',
                                      }
                                    )}
                                    helpText={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.arnHelp',
                                      {
                                        defaultMessage:
                                          'Elastic assumes this role to pull logs and metrics from CloudWatch and other AWS APIs.',
                                      }
                                    )}
                                    fullWidth
                                  >
                                    <EuiFieldText
                                      data-test-subj="observabilityOnboardingStepsIamRoleArn"
                                      fullWidth
                                      value={iamRoleArn}
                                      onChange={(e) => setIamRoleArn(e.target.value)}
                                      placeholder="arn:aws:iam::123456789012:role/ElasticObservability"
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                  </EuiFormRow>
                                  <EuiSpacer size="l" />
                                  <EuiFormRow
                                    fullWidth
                                    label={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.federated.externalIdLabel',
                                      {
                                        defaultMessage: 'External ID',
                                      }
                                    )}
                                  >
                                    <EuiFieldText
                                      type="password"
                                      data-test-subj="awsOnboardingFederatedExternalId"
                                      fullWidth
                                      value={awsExternalId}
                                      onChange={(e) => setAwsExternalId(e.target.value)}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                  </EuiFormRow>
                                  {!isAwsVersion1Wizard ? (
                                    <>
                                      <EuiSpacer size="l" />
                                      <EuiButton
                                        data-test-subj="observabilityOnboardingStepsContinueButton"
                                        color="primary"
                                        fill
                                        disabled={
                                          !canContinueStep1 ||
                                          awsAccountConnectionStatus === 'loading' ||
                                          awsAccountConnectionStatus === 'success'
                                        }
                                        isLoading={awsAccountConnectionStatus === 'loading'}
                                        onClick={() => void handleConnectAccount()}
                                      >
                                        {i18n.translate(
                                          'xpack.observabilityOnboarding.awsPage.step1.connectAccount',
                                          {
                                            defaultMessage: 'Connect account',
                                          }
                                        )}
                                      </EuiButton>
                                      {awsAccountConnectionStatus === 'success' ? (
                                        <>
                                          <EuiSpacer size="m" />
                                          <EuiCallOut
                                            data-test-subj="awsOnboardingAccountConnectSuccessCallout"
                                            title={i18n.translate(
                                              'xpack.observabilityOnboarding.awsPage.step1.connectSuccessTitle',
                                              {
                                                defaultMessage: 'Connection successful',
                                              }
                                            )}
                                            color="success"
                                            iconType="check"
                                          >
                                            <p style={{ margin: 0 }}>
                                              {i18n.translate(
                                                'xpack.observabilityOnboarding.awsPage.step1.connectSuccessBody',
                                                {
                                                  defaultMessage:
                                                    'Your credentials are valid and Elastic can connect to this AWS account.',
                                                }
                                              )}
                                            </p>
                                          </EuiCallOut>
                                        </>
                                      ) : null}
                                    </>
                                  ) : null}
                                </>
                              ),
                            },
                          ]}
                        />
                      </>
                    ) : (
                      <>
                        <EuiText size="s" color="subdued">
                          <p style={{ margin: 0 }}>
                            {i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step1.federated.existingIntro',
                              {
                                defaultMessage:
                                  'Use an IAM role you have already configured for Elastic. Enter the Role ARN and External ID from that role’s trust policy.',
                              }
                            )}
                          </p>
                        </EuiText>
                        <EuiSpacer size="l" />
                        <EuiFormRow
                          label={i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.federated.roleArnLabel',
                            {
                              defaultMessage: 'Role ARN',
                            }
                          )}
                          helpText={i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.arnHelp',
                            {
                              defaultMessage:
                                'Elastic assumes this role to pull logs and metrics from CloudWatch and other AWS APIs.',
                            }
                          )}
                          fullWidth
                        >
                          <EuiFieldText
                            data-test-subj="observabilityOnboardingStepsIamRoleArnExisting"
                            fullWidth
                            value={iamRoleArn}
                            onChange={(e) => setIamRoleArn(e.target.value)}
                            placeholder="arn:aws:iam::123456789012:role/ElasticObservability"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </EuiFormRow>
                        <EuiSpacer size="l" />
                        <EuiFormRow
                          fullWidth
                          label={i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.federated.externalIdLabel',
                            {
                              defaultMessage: 'External ID',
                            }
                          )}
                        >
                          <EuiFieldText
                            type="password"
                            data-test-subj="awsOnboardingFederatedExternalIdExisting"
                            fullWidth
                            value={awsExternalId}
                            onChange={(e) => setAwsExternalId(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </EuiFormRow>
                        {!isAwsVersion1Wizard ? (
                          <>
                            <EuiSpacer size="l" />
                            <EuiButton
                              data-test-subj="observabilityOnboardingStepsContinueButton"
                              color="primary"
                              fill
                              disabled={
                                !canContinueStep1 ||
                                awsAccountConnectionStatus === 'loading' ||
                                awsAccountConnectionStatus === 'success'
                              }
                              isLoading={awsAccountConnectionStatus === 'loading'}
                              onClick={() => void handleConnectAccount()}
                            >
                              {i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.connectAccount',
                                {
                                  defaultMessage: 'Connect account',
                                }
                              )}
                            </EuiButton>
                            {awsAccountConnectionStatus === 'success' ? (
                              <>
                                <EuiSpacer size="m" />
                                <EuiCallOut
                                  data-test-subj="awsOnboardingAccountConnectSuccessCallout"
                                  title={i18n.translate(
                                    'xpack.observabilityOnboarding.awsPage.step1.connectSuccessTitle',
                                    {
                                      defaultMessage: 'Connection successful',
                                    }
                                  )}
                                  color="success"
                                  iconType="check"
                                >
                                  <p style={{ margin: 0 }}>
                                    {i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.connectSuccessBody',
                                      {
                                        defaultMessage:
                                          'Your credentials are valid and Elastic can connect to this AWS account.',
                                      }
                                    )}
                                  </p>
                                </EuiCallOut>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
                {awsAuthMethod === 'direct_access_keys' ? (
                  <div data-test-subj="awsOnboardingDirectAccessKeysCard">
                    <EuiFlexGroup
                      alignItems="flexStart"
                      justifyContent="flexStart"
                      gutterSize="none"
                      responsive
                      wrap
                      css={css`
                        gap: 32px;
                      `}
                    >
                      <EuiFlexItem grow={true} style={{ minWidth: 0, textAlign: 'left' }}>
                        <EuiText size="s" color="subdued" style={{ textAlign: 'left' }}>
                          <p style={{ margin: 0 }}>
                            {i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step1.directAccessKeysCardDescription',
                              {
                                defaultMessage:
                                  'Access keys are long-lived credentials. Launch CloudFormation in AWS to provision a least-privilege IAM user and paste the stack outputs here, or enter keys you already created.',
                              }
                            )}{' '}
                            <EuiLink
                              data-test-subj="awsOnboardingDirectAccessKeysLearnMoreLink"
                              href={docIamRole}
                              target="_blank"
                              external
                            >
                              {i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.directAccessKeysLearnMore',
                                {
                                  defaultMessage: 'Learn more',
                                }
                              )}
                            </EuiLink>
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="awsOnboardingDirectAccessKeysLaunchCloudFormationButton"
                          iconType="launch"
                          iconSide="left"
                          color="primary"
                          href={AWS_CLOUDFORMATION_QUICK_CREATE_HREF}
                          target="_blank"
                        >
                          {i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.launchCloudFormation',
                            {
                              defaultMessage: 'Launch CloudFormation',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.accessKeyIdLabel',
                        {
                          defaultMessage: 'Access Key ID',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="observabilityOnboardingStepsAccessKeyId"
                        fullWidth
                        value={awsAccessKeyId}
                        onChange={(e) => setAwsAccessKeyId(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.secretAccessKeyLabel',
                        {
                          defaultMessage: 'Secret Access Key',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldPassword
                        data-test-subj="observabilityOnboardingStepsSecretAccessKey"
                        fullWidth
                        value={awsSecretAccessKey}
                        onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                  </div>
                ) : null}
                {awsAuthMethod === 'temporary_keys' ? (
                  <>
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.accessKeyIdLabel',
                        {
                          defaultMessage: 'Access Key ID',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="observabilityOnboardingStepsTemporaryAccessKeyId"
                        fullWidth
                        value={awsAccessKeyId}
                        onChange={(e) => setAwsAccessKeyId(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.secretAccessKeyLabel',
                        {
                          defaultMessage: 'Secret Access Key',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldPassword
                        data-test-subj="observabilityOnboardingStepsTemporarySecretAccessKey"
                        fullWidth
                        value={awsSecretAccessKey}
                        onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.sessionTokenLabel',
                        {
                          defaultMessage: 'Session token',
                        }
                      )}
                      helpText={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.sessionTokenHelp',
                        {
                          defaultMessage:
                            'Paste the session token from your STS-assumed role or temporary credentials.',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="observabilityOnboardingStepsSessionToken"
                        fullWidth
                        value={awsSessionToken}
                        onChange={(e) => setAwsSessionToken(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                  </>
                ) : null}
                {awsAuthMethod === 'direct_access_keys' || awsAuthMethod === 'temporary_keys' ? (
                  !isAwsVersion1Wizard ? (
                    <>
                      <EuiSpacer size="m" />
                      <EuiButton
                        data-test-subj="observabilityOnboardingStepsContinueButton"
                        color="primary"
                        fill
                        disabled={
                          !canContinueStep1 ||
                          awsAccountConnectionStatus === 'loading' ||
                          awsAccountConnectionStatus === 'success'
                        }
                        isLoading={awsAccountConnectionStatus === 'loading'}
                        onClick={() => void handleConnectAccount()}
                      >
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.step1.connectAccount',
                          {
                            defaultMessage: 'Connect account',
                          }
                        )}
                      </EuiButton>
                      {awsAccountConnectionStatus === 'success' ? (
                        <>
                          <EuiSpacer size="m" />
                          <EuiCallOut
                            data-test-subj="awsOnboardingAccountConnectSuccessCallout"
                            title={i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step1.connectSuccessTitle',
                              {
                                defaultMessage: 'Connection successful',
                              }
                            )}
                            color="success"
                            iconType="check"
                          >
                            <p style={{ margin: 0 }}>
                              {i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.connectSuccessBody',
                                {
                                  defaultMessage:
                                    'Your credentials are valid and Elastic can connect to this AWS account.',
                                }
                              )}
                            </p>
                          </EuiCallOut>
                        </>
                      ) : null}
                    </>
                  ) : null
                ) : null}
              </div>
            </div>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.configureIntegration.title', {
          defaultMessage: 'Name & scope',
        }),
        body: (
          <>
            <EuiText size="s" color="subdued">
              <p style={{ margin: 0 }}>
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.configureIntegration.intro',
                  {
                    defaultMessage:
                      'Add a name and description to identify this integration. Use advanced options to override the namespace used for data streams.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <div css={awsIntentGoalCardsGridCss}>
              <div css={awsIntentGridFullWidthCellCss}>
                <div data-test-subj="awsOnboardingConfigureIntegration">
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.configureIntegration.nameLabel',
                      {
                        defaultMessage: 'Name',
                      }
                    )}
                  >
                    <EuiFieldText
                      data-test-subj="awsOnboardingConfigureIntegrationName"
                      fullWidth
                      value={awsIntegrationName}
                      onChange={(e) => setAwsIntegrationName(e.target.value)}
                      placeholder="cspm-1"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </EuiFormRow>
                  <EuiSpacer size="m" />
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.configureIntegration.descriptionLabel',
                      {
                        defaultMessage: 'Description',
                      }
                    )}
                  >
                    <EuiTextArea
                      data-test-subj="awsOnboardingConfigureIntegrationDescription"
                      fullWidth
                      value={awsIntegrationDescription}
                      onChange={(e) => setAwsIntegrationDescription(e.target.value)}
                      rows={3}
                      autoComplete="off"
                      spellCheck
                    />
                  </EuiFormRow>
                  <EuiSpacer size="m" />
                  <EuiAccordion
                    id={awsIntegrationAdvancedAccordionId}
                    data-test-subj="awsOnboardingConfigureIntegrationAdvancedAccordion"
                    borders="none"
                    buttonElement="div"
                    buttonProps={{ paddingSize: 's' as const }}
                    buttonContent={
                      <EuiLink
                        color="primary"
                        data-test-subj="awsOnboardingConfigureIntegrationAdvancedOptionsLink"
                        css={css`
                          font-size: ${euiFontSize(euiThemeContext, 's').fontSize};
                        `}
                      >
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.configureIntegration.advancedOptions',
                          {
                            defaultMessage: 'Advanced options',
                          }
                        )}
                      </EuiLink>
                    }
                    arrowProps={{
                      css: css`
                        color: ${euiTheme.colors.primary};
                      `,
                    }}
                    paddingSize="s"
                  >
                    <EuiFormRow
                      fullWidth
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.configureIntegration.namespaceLabel',
                        {
                          defaultMessage: 'Namespace',
                        }
                      )}
                      helpText={
                        <>
                          {i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.configureIntegration.namespaceHelp',
                            {
                              defaultMessage:
                                'Overrides the default namespace from the parent agent policy and changes this integration’s data stream name.',
                            }
                          )}{' '}
                          <EuiLink
                            data-test-subj="observabilityOnboardingStepsLearnMoreLink"
                            href={DOC_FLEET_DATA_STREAMS}
                            target="_blank"
                            external
                          >
                            {i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.configureIntegration.namespaceLearnMore',
                              {
                                defaultMessage: 'Learn more',
                              }
                            )}
                          </EuiLink>
                        </>
                      }
                    >
                      <EuiFieldText
                        data-test-subj="awsOnboardingConfigureIntegrationNamespace"
                        fullWidth
                        value={awsIntegrationNamespace}
                        onChange={(e) => setAwsIntegrationNamespace(e.target.value)}
                        placeholder="default"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                  </EuiAccordion>
                </div>
              </div>
            </div>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.seeYourDataStep.title', {
          defaultMessage: 'See data',
        }),
        body: (
          <>
            <EuiCallOut
              data-test-subj="awsOnboardingSeeYourDataCallout"
              color="primary"
              heading="h4"
              title={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner data-test-subj="awsOnboardingSeeYourDataSpinner" size="l" />
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={true}
                    css={css`
                      min-width: 0;
                    `}
                  >
                    {i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.seeYourDataStep.calloutTitle',
                      {
                        defaultMessage:
                          'Complete all previous steps in order to start seeing your data.',
                      }
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          </>
        ),
      },
    ];
    const reorderedWizardStepPanels = isAwsVersion1Wizard
      ? stepPanels
      : [stepPanels[2], stepPanels[0], stepPanels[1], stepPanels[3], stepPanels[4]];
    return {
      awsWizardStepPanels: reorderedWizardStepPanels,
    };
  }, [
    allBrowseGroupFilteredSelected,
    awsAccessKeyId,
    awsAuthMethod,
    awsBrowseServiceSearch,
    cloudForwarderLogSources,
    awsFirehoseElasticEndpoint,
    awsFirehoseSetupPath,
    awsAgentBasedCollectSystemLogs,
    awsAgentBasedExistingPolicyId,
    awsAgentBasedHostTarget,
    awsAgentBasedNewPolicyName,
    awsExternalId,
    awsAccountConnectionStatus,
    awsFederatedIdentityName,
    awsFederatedIdentityTab,
    awsDeploymentProfile,
    awsDeploymentMethodIds,
    awsDeploymentSuperSelectOptions,
    resolvedAwsDeploymentMethod,
    awsIntegrationAccountScope,
    awsIntegrationAdvancedAccordionId,
    awsIntegrationDescription,
    awsIntegrationName,
    awsIntegrationNamespace,
    awsIntentGoalCardsGridCss,
    awsSecretAccessKey,
    awsSessionToken,
    awsServiceBrowseGroup,
    awsServicePickerGridCss,
    browseGroupFilteredServices,
    browseGroupServicesDisplayOrder,
    canContinueStep1,
    handleConnectAccount,
    isAwsVersion1Wizard,
    docIamRole,
    euiTheme.colors.primary,
    euiThemeContext,
    euiTheme.size.base,
    euiTheme.size.l,
    euiTheme.size.m,
    euiTheme.size.s,
    iamRoleArn,
    manualServiceIds,
  ]);

  const awsVersion1StepDetailDescriptionCss = useMemo(
    () => css`
      margin-block-start: 4px;
      margin-block-end: 24px;
    `,
    []
  );

  const awsWizardStepDetailInStepContentCss = useMemo(
    () => css`
      margin-block-end: 24px;
    `,
    []
  );

  const awsWizardStepDetailDescriptions = useMemo(() => {
    const selectServices = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.selectServices',
      {
        defaultMessage:
          'Use All, Logs, or Metrics to narrow the list, then pick the AWS services you want Elastic to monitor.',
      }
    );
    const selectServicesV2 = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.selectServicesAfterConnect',
      {
        defaultMessage:
          'Review integrations Elastic discovered in your account (pre-selected below). Narrow with All, Logs, or Metrics, search the catalogue, and confirm what to ingest.',
      }
    );
    const deployment = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.deployment',
      {
        defaultMessage:
          'Deployment options reflect what you selected—pick the path that matches logs, metrics, or both.',
      }
    );
    const connect = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.connect',
      {
        defaultMessage:
          'Choose how Elastic authenticates to AWS and enter the credentials that match that method.',
      }
    );
    const configure = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.configure',
      {
        defaultMessage:
          'Give the integration a clear name and choose organization-wide vs. single-account scope.',
      }
    );
    const seeData = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.seeData',
      {
        defaultMessage:
          'Finish the flow, then confirm data is arriving and open views tailored to your AWS telemetry.',
      }
    );
    if (isAwsVersion1Wizard) {
      return [selectServices, deployment, connect, configure, seeData] as const;
    }
    return [connect, selectServicesV2, deployment, configure, seeData] as const;
  }, [isAwsVersion1Wizard]);

  const awsWizardStepsForEui = useMemo(() => {
    const fullSteps = awsWizardStepPanels.map(({ title, body }) => ({
      title,
      children: body,
    }));

    const wrapStepBodyWithDetail = (stepIndex: number, children: React.ReactNode) => (
      <>
        <EuiText
          size="s"
          color="subdued"
          css={awsWizardStepDetailInStepContentCss}
          data-test-subj={`awsOnboardingWizardStepDetail-${stepIndex}`}
        >
          <p style={{ margin: 0 }}>{awsWizardStepDetailDescriptions[stepIndex]}</p>
        </EuiText>
        {children}
      </>
    );

    if (isAwsVersion1Wizard) {
      return fullSteps;
    }

    if (
      isAwsVersion2Wizard &&
      (awsAccountConnectionStatus !== 'success' || awsServiceDiscoveryStatus === 'loading')
    ) {
      const isConnected = awsAccountConnectionStatus === 'success';
      return [
        {
          title: fullSteps[0].title,
          children: wrapStepBodyWithDetail(0, fullSteps[0].children),
          status: isConnected ? ('complete' as const) : ('current' as const),
        },
        {
          title: fullSteps[1].title,
          children: <></>,
          status: 'loading' as const,
        },
      ];
    }

    if (isAwsVersion2Wizard) {
      return fullSteps.map((step, index) => ({
        ...step,
        children: wrapStepBodyWithDetail(index, step.children),
        status:
          index === 0
            ? ('complete' as const)
            : index === 1
            ? ('current' as const)
            : ('incomplete' as const),
      }));
    }

    const credsOk = awsAccountConnectionStatus === 'success';
    const servicesOk = manualServiceIds.size > 0;
    const deployOk = canContinueAwsVersion1Deployment;
    const configureOk = canContinueAwsVersion1Configure;

    let currentIndex = 0;
    if (!credsOk) {
      currentIndex = 0;
    } else if (!servicesOk) {
      currentIndex = 1;
    } else if (!deployOk) {
      currentIndex = 2;
    } else if (!configureOk) {
      currentIndex = 3;
    } else {
      currentIndex = 4;
    }

    return fullSteps.map((step, index) => ({
      ...step,
      children: wrapStepBodyWithDetail(index, step.children),
      status:
        index < currentIndex
          ? ('complete' as const)
          : index === currentIndex
          ? ('current' as const)
          : ('incomplete' as const),
    }));
  }, [
    awsAccountConnectionStatus,
    awsServiceDiscoveryStatus,
    awsWizardStepDetailDescriptions,
    awsWizardStepDetailInStepContentCss,
    awsWizardStepPanels,
    canContinueAwsVersion1Configure,
    canContinueAwsVersion1Deployment,
    isAwsVersion1Wizard,
    isAwsVersion2Wizard,
    manualServiceIds.size,
  ]);

  const awsVersion1StepContinueEnabled =
    awsVersion1StepIndex === 0
      ? canContinueAwsVersion1Monitor
      : awsVersion1StepIndex === 1
      ? canContinueAwsVersion1Deployment
      : awsVersion1StepIndex === 2
      ? canContinueStep1 && awsAccountConnectionStatus !== 'loading'
      : awsVersion1StepIndex === 3
      ? canContinueAwsVersion1Configure
      : true;

  /** Right-panel headings for Version 1 (distinct from left-rail step labels). */
  const awsVersion1RightPanelTitles = useMemo(
    () =>
      [
        i18n.translate(
          'xpack.observabilityOnboarding.awsPage.version1Wizard.contentTitle.monitoring',
          {
            defaultMessage: 'Browse and pick your AWS services',
          }
        ),
        i18n.translate(
          'xpack.observabilityOnboarding.awsPage.version1Wizard.contentTitle.deployment',
          {
            defaultMessage: 'How Elastic will collect from AWS',
          }
        ),
        i18n.translate(
          'xpack.observabilityOnboarding.awsPage.version1Wizard.contentTitle.connect',
          {
            defaultMessage: 'Authenticate to your account',
          }
        ),
        i18n.translate(
          'xpack.observabilityOnboarding.awsPage.version1Wizard.contentTitle.configure',
          {
            defaultMessage: 'Name and scope this integration',
          }
        ),
        i18n.translate(
          'xpack.observabilityOnboarding.awsPage.version1Wizard.contentTitle.seeData',
          {
            defaultMessage: 'Get ready to view telemetry',
          }
        ),
      ] as const,
    []
  );

  return (
    <>
      <Global styles={awsOnboardingSuperSelectMenuItemGlobalCss} />
      <PageTemplate
        customHeader={
          <IntegrationHeader
            logoSrc={tile?.logoUrl}
            logoAlt={displayName}
            title={displayName}
            subtitle={subtitle}
          />
        }
      >
        {isAwsVersion1Wizard ? (
          <div
            css={awsVersion1WizardChromeShellCss}
            data-test-subj="awsOnboardingVersion1WizardChromeShell"
          >
            <EuiFlexGroup
              alignItems="stretch"
              gutterSize="none"
              responsive
              css={awsVersion1WizardFlexRowCss}
              data-test-subj="awsOnboardingVersion1WizardLayout"
            >
              <EuiFlexItem
                grow={false}
                css={css`
                  flex: 0 0 auto;
                  width: max-content;
                  max-width: 100%;
                  align-self: flex-start;
                  position: sticky;
                  top: 32px;
                  z-index: 1;
                  /* Longest step title + 24px before the divider (see awsVersion1SidebarStepsCss). */
                  padding-inline-end: ${euiTheme.size.l};
                  background-color: ${euiTheme.colors.backgroundBasePlain};
                  @media (max-width: ${euiTheme.breakpoint.m}px) {
                    width: 100%;
                    max-width: none;
                    align-self: stretch;
                    position: static;
                    padding-inline-end: 0;
                  }
                `}
              >
                <div className="euiSteps" css={awsVersion1SidebarStepsCss}>
                  {awsWizardStepPanels.map((panel, i) => {
                    const isPast = i < awsVersion1StepIndex;
                    const isCurrent = i === awsVersion1StepIndex;
                    const status = isPast ? 'complete' : isCurrent ? 'current' : 'disabled';
                    return (
                      <EuiStep
                        key={i}
                        aria-current={isCurrent ? 'step' : undefined}
                        data-test-subj={`awsOnboardingVersion1NavStep-${i}`}
                        step={i + 1}
                        title={panel.title}
                        titleSize="xs"
                        headingElement="h3"
                        status={status}
                        onClick={
                          isPast
                            ? () => {
                                setAwsVersion1StepIndex(i);
                              }
                            : undefined
                        }
                        onKeyDown={
                          isPast
                            ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setAwsVersion1StepIndex(i);
                                }
                              }
                            : undefined
                        }
                        tabIndex={isPast ? 0 : undefined}
                        role={isPast ? 'button' : undefined}
                        css={
                          isPast
                            ? css`
                                cursor: pointer;
                                &:focus-visible {
                                  outline: 2px solid ${euiTheme.colors.primary};
                                  outline-offset: 2px;
                                }
                              `
                            : undefined
                        }
                      >
                        <></>
                      </EuiStep>
                    );
                  })}
                </div>
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                css={css`
                  align-self: stretch;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                `}
              >
                <div
                  role="separator"
                  aria-orientation="vertical"
                  data-test-subj="awsOnboardingVersion1ColumnDivider"
                  css={css`
                    align-self: stretch;
                    flex: 1 1 auto;
                    min-height: 0;
                    inline-size: ${euiTheme.border.width.thin};
                    flex-shrink: 0;
                    background-color: ${euiTheme.colors.borderBaseSubdued};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem
                grow={true}
                css={css`
                  min-width: 0;
                  padding-inline-start: 24px;
                `}
              >
                <div
                  css={css`
                    padding-inline-start: 0;
                    padding-inline-end: ${euiTheme.size.m};
                    padding-block-start: 0;
                    padding-block-end: ${euiTheme.size.l};
                  `}
                >
                  {awsVersion1StepIndex === 2 ? (
                    <EuiFlexGroup
                      alignItems="baseline"
                      justifyContent="flexStart"
                      gutterSize="s"
                      responsive
                      wrap
                      data-test-subj="awsOnboardingVersion1ContentTitleRow"
                    >
                      <EuiFlexItem grow={false}>
                        <EuiTitle size="s" data-test-subj="awsOnboardingVersion1ContentTitle">
                          <h2 id="awsOnboardingVersion1ContentTitle">
                            {awsVersion1RightPanelTitles[awsVersion1StepIndex]}
                          </h2>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink
                          data-test-subj="observabilityOnboardingStepsLearnMoreAboutAwsMonitoringLink"
                          href={docIamRole}
                          target="_blank"
                          external
                        >
                          {i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.version1Wizard.learnMoreAuthenticate',
                            {
                              defaultMessage: 'Learn more',
                            }
                          )}
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <EuiTitle size="s" data-test-subj="awsOnboardingVersion1ContentTitle">
                      <h2 id="awsOnboardingVersion1ContentTitle">
                        {awsVersion1RightPanelTitles[awsVersion1StepIndex]}
                      </h2>
                    </EuiTitle>
                  )}
                  <EuiText
                    size="s"
                    color="subdued"
                    css={awsVersion1StepDetailDescriptionCss}
                    data-test-subj={`awsOnboardingVersion1StepDescription-${awsVersion1StepIndex}`}
                  >
                    <p style={{ margin: 0 }}>
                      {awsWizardStepDetailDescriptions[awsVersion1StepIndex]}
                    </p>
                  </EuiText>
                  <div data-test-subj={`awsOnboardingVersion1StepContent-${awsVersion1StepIndex}`}>
                    {awsWizardStepPanels[awsVersion1StepIndex]?.body}
                  </div>
                  <EuiHorizontalRule
                    margin="none"
                    css={css`
                      margin-block-start: 32px;
                      margin-block-end: ${euiTheme.size.m};
                    `}
                  />
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="m"
                    justifyContent="flexEnd"
                    responsive={false}
                    wrap
                  >
                    {awsVersion1StepIndex > 0 ? (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          data-test-subj="awsOnboardingVersion1StepBackButton"
                          size="m"
                          iconType="arrowLeft"
                          onClick={() => {
                            setAwsVersion1StepIndex((n) => Math.max(0, n - 1));
                          }}
                        >
                          {i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.version1Wizard.back',
                            {
                              defaultMessage: 'Back',
                            }
                          )}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="awsOnboardingVersion1StepContinueButton"
                        fill
                        color="primary"
                        size="m"
                        disabled={!awsVersion1StepContinueEnabled}
                        isLoading={
                          isAwsVersion1Wizard &&
                          awsVersion1StepIndex === 2 &&
                          awsAccountConnectionStatus === 'loading'
                        }
                        onClick={() => {
                          if (
                            isAwsVersion1Wizard &&
                            awsVersion1StepIndex === 2 &&
                            awsAccountConnectionStatus !== 'success'
                          ) {
                            void handleConnectAccount();
                            return;
                          }
                          if (awsVersion1StepIndex < awsWizardStepPanels.length - 1) {
                            setAwsVersion1StepIndex((n) => n + 1);
                          }
                        }}
                      >
                        {awsVersion1StepIndex === awsWizardStepPanels.length - 1
                          ? i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.version1Wizard.done',
                              {
                                defaultMessage: 'Done',
                              }
                            )
                          : awsVersion1StepIndex === 2 && awsAccountConnectionStatus === 'success'
                          ? i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.version1Wizard.continue',
                              {
                                defaultMessage: 'Continue',
                              }
                            )
                          : awsVersion1StepIndex === 2
                          ? i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step1.connectAccount',
                              {
                                defaultMessage: 'Connect account',
                              }
                            )
                          : i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.version1Wizard.continue',
                              {
                                defaultMessage: 'Continue',
                              }
                            )}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ) : (
          <EuiSteps css={stepsCss} steps={awsWizardStepsForEui} />
        )}
      </PageTemplate>
    </>
  );
};
