/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiLink,
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
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from './template';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';
import { INTEGRATION_HEADER_LOGO_FRAME_PX, IntegrationHeader } from '../header/integration_header';
import { SECTIONS } from './ingest_hub/ingest_hub_data';
import {
  AWS_SERVICES,
  AWS_SERVICES_VERSION1_MATRIX,
  AWS_VERSION1_LOGS_ID_SET,
} from './ingest_hub/aws_services_data';
import { AwsOnboardingConfigurationStep } from './aws_onboarding_configuration_step';
import { AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME } from './aws_onboarding_deployment_panels';
import { AwsOnboardingSelectServicesStep } from './aws_onboarding_select_services_step';
import { AwsVersion1SeeDataStreamsCallout } from './aws_version1_see_data_streams_callout';
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

const awsOnboardingServiceMap = new Map(
  [...AWS_SERVICES, ...AWS_SERVICES_VERSION1_MATRIX].map((s) => [s.id, s])
);

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

// ─── Shared layout primitives (Kubernetes onboarding patterns) ─────────────

/** Child of `awsIntentGoalCardsGridCss`: span the full grid width (deployment / connect rows). */
const awsIntentGridFullWidthCellCss = css`
  grid-column: 1 / -1;
  min-width: 0;
`;

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
       * is the first flex item). EuiStep titleSize="xxs" uses a circle of size.base.
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

      /* Vertical spacing between step labels (connector line lives in ::before). */
      .euiStep:not(:last-of-type) {
        padding-block-end: ${euiTheme.size.m};
      }

      .euiStep:not(:last-of-type)::before {
        border-left-color: ${euiTheme.colors.borderBaseSubdued};
      }

      /* EUI default gap is size.base (16px) between step number and title. */
      .euiStep__titleWrapper {
        gap: ${euiTheme.size.m} !important;
        align-items: center;
      }

      .euiStep__title {
        font-weight: ${euiTheme.font.weight.medium} !important;
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
  const [manualServiceIds, setManualServiceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [awsIntegrationAccountScope, setAwsIntegrationAccountScope] =
    useState<AwsIntegrationAccountScopeId>('organization');
  const [awsIntegrationName, setAwsIntegrationName] = useState('');
  const [awsIntegrationDescription, setAwsIntegrationDescription] = useState('');
  const [awsIntegrationNamespace, setAwsIntegrationNamespace] = useState('default');
  const [configurationStepCanContinue, setConfigurationStepCanContinue] = useState(false);
  const awsIntegrationAdvancedAccordionId = useGeneratedHtmlId({
    prefix: 'awsIntegrationAdvanced',
  });

  const awsWizardServiceCatalog = isAwsVersion1Wizard ? AWS_SERVICES_VERSION1_MATRIX : AWS_SERVICES;
  const awsWizardLogsServiceIdSet = isAwsVersion1Wizard
    ? AWS_VERSION1_LOGS_ID_SET
    : AWS_LOGS_SERVICE_ID_SET;

  const handleConfigurationStepCanContinueChange = useCallback((canContinue: boolean) => {
    setConfigurationStepCanContinue(canContinue);
  }, []);

  const selectedAwsServicesVersion1 = useMemo(
    () => AWS_SERVICES_VERSION1_MATRIX.filter((s) => manualServiceIds.has(s.id)),
    [manualServiceIds]
  );

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

  useEffect(() => {
    setAwsVersion1StepIndex(0);
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
        if (awsOnboardingServiceMap.has(id)) {
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

  const awsVersion1SelectServicesStepContentCss = useMemo(
    () => css`
      padding-block-start: ${euiTheme.size.base};
    `,
    [euiTheme.size.base]
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
        body: null,
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.configuration.title', {
          defaultMessage: 'Configuration',
        }),
        body: null,
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
        body: isAwsVersion1Wizard ? (
          <AwsVersion1SeeDataStreamsCallout selectedServices={selectedAwsServicesVersion1} />
        ) : (
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
    awsAccessKeyId,
    awsAuthMethod,
    awsExternalId,
    awsAccountConnectionStatus,
    awsFederatedIdentityName,
    awsFederatedIdentityTab,
    awsIntegrationAccountScope,
    awsIntegrationAdvancedAccordionId,
    awsIntegrationDescription,
    awsIntegrationName,
    awsIntegrationNamespace,
    awsIntentGoalCardsGridCss,
    awsSecretAccessKey,
    awsSessionToken,
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
    selectedAwsServicesVersion1,
  ]);

  const isAwsWizardSelectServicesStep = useCallback(
    (panelIndex: number) => (isAwsVersion1Wizard ? panelIndex === 0 : panelIndex === 1),
    [isAwsVersion1Wizard]
  );

  const renderAwsWizardSelectServicesStep = useCallback(
    () => (
      <AwsOnboardingSelectServicesStep
        key={activeVersion}
        catalog={awsWizardServiceCatalog}
        logsServiceIdSet={awsWizardLogsServiceIdSet}
        manualServiceIds={manualServiceIds}
        onSetManualServiceIds={setManualServiceIds}
      />
    ),
    [activeVersion, awsWizardServiceCatalog, awsWizardLogsServiceIdSet, manualServiceIds]
  );

  const AWS_WIZARD_CONFIGURATION_STEP_INDEX = 1;

  const renderAwsOnboardingConfigurationStepElement = useCallback(
    () => (
      <AwsOnboardingConfigurationStep
        catalog={awsWizardServiceCatalog}
        selectedServiceIds={manualServiceIds}
        onCanContinueChange={handleConfigurationStepCanContinueChange}
      />
    ),
    [
      awsWizardServiceCatalog,
      handleConfigurationStepCanContinueChange,
      manualServiceIds,
    ]
  );

  const renderAwsWizardStepBody = useCallback(
    (panelIndex: number) => {
      if (isAwsWizardSelectServicesStep(panelIndex)) {
        return renderAwsWizardSelectServicesStep();
      }
      if (panelIndex === AWS_WIZARD_CONFIGURATION_STEP_INDEX) {
        return renderAwsOnboardingConfigurationStepElement();
      }
      return awsWizardStepPanels[panelIndex]?.body ?? null;
    },
    [
      awsWizardStepPanels,
      isAwsWizardSelectServicesStep,
      renderAwsOnboardingConfigurationStepElement,
      renderAwsWizardSelectServicesStep,
    ]
  );

  const renderAwsVersion1StepContent = useCallback(() => {
    if (awsVersion1StepIndex === 0) {
      return renderAwsWizardSelectServicesStep();
    }
    if (awsVersion1StepIndex === AWS_WIZARD_CONFIGURATION_STEP_INDEX) {
      return renderAwsOnboardingConfigurationStepElement();
    }
    return awsWizardStepPanels[awsVersion1StepIndex]?.body ?? null;
  }, [
    awsVersion1StepIndex,
    awsWizardStepPanels,
    renderAwsOnboardingConfigurationStepElement,
    renderAwsWizardSelectServicesStep,
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
    const selectServicesV2 = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.selectServicesAfterConnect',
      {
        defaultMessage:
          'Review integrations Elastic discovered in your account (pre-selected below). Narrow with All, Logs, or Metrics, search the catalogue, and confirm what to ingest.',
      }
    );
    const configuration = i18n.translate(
      'xpack.observabilityOnboarding.awsPage.wizardStepDetail.configuration',
      {
        defaultMessage:
          'Review Elastic-provided connection details, add your API token, and complete integration parameters for the services you selected.',
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
      return ['', configuration, connect, configure, seeData] as const;
    }
    return [connect, selectServicesV2, configuration, configure, seeData] as const;
  }, [isAwsVersion1Wizard]);

  const awsWizardStepsForEui = useMemo(() => {
    if (isAwsVersion1Wizard) {
      return [];
    }

    const fullSteps = awsWizardStepPanels.map(({ title }, index) => ({
      title,
      children: renderAwsWizardStepBody(index),
    }));

    const wrapStepBodyWithDetail = (stepIndex: number, children: React.ReactNode) => {
      const stepDetailDescription = awsWizardStepDetailDescriptions[stepIndex];
      return (
        <>
          {stepDetailDescription ? (
            <EuiText
              size="s"
              color="subdued"
              css={awsWizardStepDetailInStepContentCss}
              data-test-subj={`awsOnboardingWizardStepDetail-${stepIndex}`}
            >
              <p style={{ margin: 0 }}>{stepDetailDescription}</p>
            </EuiText>
          ) : null}
          {children}
        </>
      );
    };

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
    const configurationOk = configurationStepCanContinue;
    const configureOk = canContinueAwsVersion1Configure;

    let currentIndex = 0;
    if (!credsOk) {
      currentIndex = 0;
    } else if (!servicesOk) {
      currentIndex = 1;
    } else if (!configurationOk) {
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
    configurationStepCanContinue,
    isAwsVersion1Wizard,
    isAwsVersion2Wizard,
    manualServiceIds.size,
    renderAwsWizardStepBody,
  ]);

  const awsVersion1StepContinueEnabled =
    awsVersion1StepIndex === 0
      ? canContinueAwsVersion1Monitor
      : awsVersion1StepIndex === 1
      ? configurationStepCanContinue
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
          'xpack.observabilityOnboarding.awsPage.version1Wizard.contentTitle.configuration',
          {
            defaultMessage: 'Configure your Elastic connection',
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
                        titleSize="xxs"
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
                    <EuiTitle
                      size="s"
                      data-test-subj="awsOnboardingVersion1ContentTitle"
                      css={css`
                        h2 {
                          margin-block-end: 0;
                        }
                      `}
                    >
                      <h2 id="awsOnboardingVersion1ContentTitle">
                        {awsVersion1RightPanelTitles[awsVersion1StepIndex]}
                      </h2>
                    </EuiTitle>
                  )}
                  {awsWizardStepDetailDescriptions[awsVersion1StepIndex] ? (
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
                  ) : null}
                  <div
                    css={
                      awsVersion1StepIndex === 0
                        ? awsVersion1SelectServicesStepContentCss
                        : undefined
                    }
                    data-test-subj={`awsOnboardingVersion1StepContent-${awsVersion1StepIndex}`}
                  >
                    {renderAwsVersion1StepContent()}
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
