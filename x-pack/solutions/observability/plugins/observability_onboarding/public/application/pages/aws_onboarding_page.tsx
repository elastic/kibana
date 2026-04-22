/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldPassword,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  euiFontSize,
  transparentize,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useInterval from 'react-use/lib/useInterval';
import { PageTemplate } from './template';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';
import { IntegrationHeader } from '../header/integration_header';
import { SECTIONS } from './ingest_hub/ingest_hub_data';
import { AWS_SERVICES, type AwsService } from './ingest_hub/aws_services_data';
import { useActiveVersion } from '../version_switcher_widget';
import { FETCH_STATUS, useFetcher } from '../../hooks/use_fetcher';
import type { ObservabilityOnboardingAppServices } from '../..';

const AWS_TILE = SECTIONS.flatMap((s) => s.tiles).find((t) => t.id === 'aws');

const ELASTIC_LOGOS = 'https://raw.githubusercontent.com/elastic/integrations/main/packages';

type IntentCategoryId = 'security_compliance' | 'app_performance' | 'cost_infra' | 'data_streaming';

/** Intent groups — collection methods are derived from the union of these services. */
const INTENT_CATEGORIES: ReadonlyArray<{
  readonly id: IntentCategoryId;
  readonly serviceIds: readonly string[];
}> = [
  {
    id: 'security_compliance',
    serviceIds: ['amazon_guardduty', 'amazon_inspector', 'aws_cloudtrail', 'aws_waf'],
  },
  {
    id: 'app_performance',
    serviceIds: [
      'amazon_ec2',
      'amazon_ecs',
      'aws_lambda',
      'aws_apigateway',
      'amazon_dynamodb',
      'aws_elb',
    ],
  },
  {
    id: 'cost_infra',
    serviceIds: ['aws_health', 'aws_billing', 'amazon_cloudfront', 'amazon_s3'],
  },
  {
    id: 'data_streaming',
    serviceIds: ['amazon_kinesis', 'amazon_firehose', 'amazon_msk', 'amazon_sqs'],
  },
];

const serviceMap = new Map(AWS_SERVICES.map((s) => [s.id, s]));

function resolveServicesFromIds(ids: ReadonlySet<string>): AwsService[] {
  return Array.from(ids)
    .filter((sid) => serviceMap.has(sid))
    .map((sid) => serviceMap.get(sid)!)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function servicesForIntentCategory(cat: (typeof INTENT_CATEGORIES)[number]): AwsService[] {
  return cat.serviceIds.filter((sid) => serviceMap.has(sid)).map((sid) => serviceMap.get(sid)!);
}

function unionServiceIdsForIntentIds(intentIds: ReadonlySet<IntentCategoryId>): Set<string> {
  const next = new Set<string>();
  for (const intentId of intentIds) {
    const cat = INTENT_CATEGORIES.find((c) => c.id === intentId);
    if (!cat) continue;
    for (const sid of cat.serviceIds) {
      if (serviceMap.has(sid)) next.add(sid);
    }
  }
  return next;
}

const MAX_SERVICE_LOGOS_PREVIEW = 4;

function serviceLogoPreview(
  services: readonly AwsService[],
  maxLogos: number = MAX_SERVICE_LOGOS_PREVIEW
): {
  readonly shown: AwsService[];
  readonly overflow: number;
} {
  const shown = services.slice(0, maxLogos);
  const overflow = Math.max(0, services.length - maxLogos);
  return { shown, overflow };
}

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

/** Stacked logos for goal cards (same size as service cards, overlapping). */
const IntentGoalLogoStack: React.FC<{
  services: readonly AwsService[];
  /** When the parent control uses an inverse / filled surface (e.g. filter toggle). */
  isOnEmphasizedBackground?: boolean;
}> = ({ services, isOnEmphasizedBackground = false }) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name));
  const { shown, overflow } = serviceLogoPreview(sorted, 3);
  const logoSize = 26;
  const overlapPx = Math.round(logoSize * 0.38);

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <div
        css={css`
          display: flex;
          flex-direction: row;
          align-items: center;
        `}
      >
        {shown.map((svc, index) => (
          <div
            key={svc.id}
            css={css`
              margin-left: ${index === 0 ? 0 : -overlapPx}px;
              position: relative;
              z-index: ${index + 1};
            `}
          >
            <LogoBadge src={svc.logoUrl} alt={svc.name} size={logoSize} />
          </div>
        ))}
      </div>
      {overflow > 0 ? (
        <span
          css={css`
            margin-left: ${euiTheme.size.xs};
            font-size: ${euiFontSize(euiThemeContext, 'xs').fontSize};
            font-weight: ${euiTheme.font.weight.medium};
            line-height: 1;
            color: ${isOnEmphasizedBackground
              ? euiTheme.colors.textInverse
              : euiTheme.colors.textSubdued};
          `}
        >
          {i18n.translate('xpack.observabilityOnboarding.awsPage.step2.serviceLogoOverflow', {
            defaultMessage: '+{count}',
            values: { count: overflow },
          })}
        </span>
      ) : null}
    </EuiFlexGroup>
  );
};

const intentGoalCardCss = css`
  height: 100%;
  & [class*='euiCheckableCard__label'] {
    width: 100%;
  }
  p {
    margin: 0;
  }
`;

const AWS_SERVICE_GRID_SCROLL_HEIGHT_PX = 360;

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
  const fadeHeight = `calc(${euiTheme.size.xl} + ${euiTheme.size.xl} + ${euiTheme.size.m} + ${euiTheme.size.s})`;
  const borderClearance = euiTheme.border.width.thin;

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
          inset-inline: ${borderClearance};
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
          inset-inline: ${borderClearance};
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
`;

function intentTitle(id: IntentCategoryId): string {
  switch (id) {
    case 'security_compliance':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.securityTitle', {
        defaultMessage: 'Security & compliance',
      });
    case 'app_performance':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.appPerfTitle', {
        defaultMessage: 'Application performance',
      });
    case 'cost_infra':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.costTitle', {
        defaultMessage: 'Cost & infrastructure',
      });
    case 'data_streaming':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.dataTitle', {
        defaultMessage: 'Data & streaming',
      });
    default:
      return id;
  }
}

function intentDescription(id: IntentCategoryId): string {
  switch (id) {
    case 'security_compliance':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.securityDesc', {
        defaultMessage: 'Threat detection, posture, API audit trails, and edge protection.',
      });
    case 'app_performance':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.appPerfDesc', {
        defaultMessage: 'Workloads, APIs, data stores, and load balancers your users depend on.',
      });
    case 'cost_infra':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.costDesc', {
        defaultMessage: 'Account health, spend signals, CDN, and object storage.',
      });
    case 'data_streaming':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.intent.dataDesc', {
        defaultMessage: 'Streams, pipelines, queues, and high-volume delivery into Elastic.',
      });
    default:
      return '';
  }
}

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
  const { euiTheme } = useEuiTheme();
  const stepsCss = useMemo(
    () => css`
      margin-left: 16px;
      .euiStep__titleWrapper {
        align-items: center;
      }
      .euiStep__content {
        margin-block-start: 0 !important;
        padding-block-start: ${euiTheme.size.s} !important;
      }
      /* Space between steps without margin between .euiStep siblings (keeps vertical connector continuous). */
      .euiStep:not(:last-of-type) .euiStep__content {
        padding-block-end: calc(48px + ${euiTheme.size.xl} + ${euiTheme.size.s}) !important;
      }
      .euiStep__title {
        padding-block-start: 0;
      }
    `,
    [euiTheme]
  );
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const integrationsAwsHref = http.basePath.prepend('/app/integrations/detail/aws/overview');
  const docIamRole = 'https://www.elastic.co/guide/en/observability/current/monitor-aws.html';

  const useSubduedShell = activeVersion === 'version3';

  /** Service picker grid gaps should read as white, not the subdued shell tint. */
  const awsIndividualServicesPanelProps = useMemo(
    () =>
      useSubduedShell
        ? { color: 'plain' as const, hasBorder: true as const, hasShadow: false as const }
        : { hasBorder: true as const, color: 'plain' as const },
    [useSubduedShell]
  );

  const [iamRoleArn, setIamRoleArn] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [selectedIntentIds, setSelectedIntentIds] = useState<ReadonlySet<IntentCategoryId>>(
    () => new Set()
  );
  /** Search + service grid (progressive disclosure under goal cards). */
  const [individualServicesOpen, setIndividualServicesOpen] = useState(false);
  const [powerSearch, setPowerSearch] = useState('');
  const [manualServiceIds, setManualServiceIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleIntent = useCallback(
    (id: IntentCategoryId) => {
      const cat = INTENT_CATEGORIES.find((c) => c.id === id);
      if (!cat) return;
      const willActivateGoal = !selectedIntentIds.has(id);
      if (willActivateGoal) {
        setIndividualServicesOpen(true);
      }
      setSelectedIntentIds((prevIntent) => {
        const activating = !prevIntent.has(id);
        const nextIntent = new Set(prevIntent);
        if (activating) nextIntent.add(id);
        else nextIntent.delete(id);

        setManualServiceIds((prevManual) => {
          if (activating) {
            return unionServiceIdsForIntentIds(nextIntent);
          }
          const nextManual = new Set(prevManual);
          for (const sid of cat.serviceIds) {
            if (serviceMap.has(sid)) nextManual.delete(sid);
          }
          return nextManual;
        });

        return nextIntent;
      });
    },
    [selectedIntentIds]
  );

  const toggleManualService = (id: string) => {
    setManualServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolvedServices = useMemo(
    () => resolveServicesFromIds(manualServiceIds),
    [manualServiceIds]
  );

  const {
    data: awsIngestDataStatus,
    status: awsIngestDataStatusFetchStatus,
    refetch: refetchAwsIngestDataStatus,
  } = useFetcher(
    (callApi) =>
      callApi('GET /internal/observability_onboarding/aws/has-data', {
        params: { query: {} },
      }),
    [],
    { showToastOnError: false }
  );

  const awsObservabilityDataReceived = awsIngestDataStatus?.hasData === true;

  useInterval(
    () => {
      if (awsObservabilityDataReceived || awsIngestDataStatusFetchStatus === FETCH_STATUS.LOADING) {
        return;
      }
      void refetchAwsIngestDataStatus();
    },
    awsObservabilityDataReceived ? null : 3000
  );

  const hasRoleCredentials = Boolean(iamRoleArn.trim());
  const hasAccessKeyCredentials = Boolean(awsAccessKeyId.trim() && awsSecretAccessKey.trim());
  const canContinueStep1 = hasRoleCredentials || hasAccessKeyCredentials;

  const powerGridServices = useMemo(() => {
    const q = powerSearch.trim().toLowerCase();
    if (!q) return AWS_SERVICES;
    return AWS_SERVICES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
    );
  }, [powerSearch]);

  const sortedPowerGridServices = useMemo(
    () => [...powerGridServices].sort((a, b) => a.name.localeCompare(b.name)),
    [powerGridServices]
  );

  const allFilteredPowerGridServicesSelected = useMemo(
    () =>
      sortedPowerGridServices.length > 0 &&
      sortedPowerGridServices.every((s) => manualServiceIds.has(s.id)),
    [sortedPowerGridServices, manualServiceIds]
  );

  /** Selected checkboxes first (e.g. after picking a goal), then the rest — both groups A–Z. */
  const powerGridServicesDisplayOrder = useMemo(() => {
    const selected = sortedPowerGridServices.filter((s) => manualServiceIds.has(s.id));
    const unselected = sortedPowerGridServices.filter((s) => !manualServiceIds.has(s.id));
    return [...selected, ...unselected];
  }, [sortedPowerGridServices, manualServiceIds]);

  const awsServicePickerGridCss = useMemo(
    () =>
      css`
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: ${euiTheme.size.s};
        padding-inline: ${euiTheme.size.m};
        padding-bottom: 0;
        @media (max-width: ${euiTheme.breakpoint.m}px) {
          grid-template-columns: 1fr;
        }
      `,
    [euiTheme.breakpoint.m, euiTheme.size.m, euiTheme.size.s]
  );

  const steps = useMemo(
    () => [
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.step1.title', {
          defaultMessage: 'Connect your AWS account',
        }),
        children: (
          <>
            <EuiText size="s" color="subdued">
              <p style={{ margin: 0 }}>
                {i18n.translate('xpack.observabilityOnboarding.awsPage.step1.intro', {
                  defaultMessage:
                    'An IAM Role lets Elastic pull logs and metrics directly from your AWS APIs.',
                })}{' '}
                <EuiLink
                  data-test-subj="observabilityOnboardingStepsLearnMoreAboutIamRoleLink"
                  href={docIamRole}
                  target="_blank"
                  external
                >
                  {i18n.translate('xpack.observabilityOnboarding.awsPage.step1.learnIamRole', {
                    defaultMessage: 'Learn more about IAM role',
                  })}
                </EuiLink>
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.observabilityOnboarding.awsPage.step1.arnLabel', {
                defaultMessage: 'IAM Role ARN',
              })}
              helpText={i18n.translate('xpack.observabilityOnboarding.awsPage.step1.arnHelp', {
                defaultMessage:
                  'Elastic assumes this role to pull logs and metrics from CloudWatch and other AWS APIs.',
              })}
              fullWidth
            >
              <EuiFieldText
                data-test-subj="observabilityOnboardingStepsFieldText"
                fullWidth
                value={iamRoleArn}
                onChange={(e) => setIamRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/ElasticObservability"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiAccordion
              id="aws-advanced-credentials"
              buttonContent={
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.observabilityOnboarding.awsPage.step1.advancedTitle', {
                      defaultMessage: 'Advanced: access keys',
                    })}
                  </strong>
                </EuiText>
              }
              paddingSize="s"
            >
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('xpack.observabilityOnboarding.awsPage.step1.advancedBody', {
                    defaultMessage:
                      'Use static access keys only when an IAM role is not possible. Prefer the recommended role flow above.',
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
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
                  data-test-subj="observabilityOnboardingStepsFieldText"
                  fullWidth
                  value={awsAccessKeyId}
                  onChange={(e) => setAwsAccessKeyId(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </EuiFormRow>
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
                  fullWidth
                  value={awsSecretAccessKey}
                  onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </EuiFormRow>
            </EuiAccordion>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="observabilityOnboardingStepsContinueButton"
              color="primary"
              fill
              disabled={!canContinueStep1}
            >
              {i18n.translate('xpack.observabilityOnboarding.awsPage.step1.connectAccount', {
                defaultMessage: 'Connect account',
              })}
            </EuiButton>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.step2.title', {
          defaultMessage: 'What do you want to monitor?',
        }),
        children: (
          <>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.observabilityOnboarding.awsPage.step2.intro', {
                  defaultMessage:
                    'Use goal cards to add groups of services, or pick individual services in the list below.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="l" />
            <div
              css={css`
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: ${euiTheme.size.m};
                @media (max-width: ${euiTheme.breakpoint.m}px) {
                  grid-template-columns: 1fr;
                }
              `}
            >
              {INTENT_CATEGORIES.map((cat) => {
                const checked = selectedIntentIds.has(cat.id);
                return (
                  <EuiCheckableCard
                    key={cat.id}
                    id={`aws-goal-${cat.id}`}
                    data-test-subj={`awsOnboardingGoalCard-${cat.id}`}
                    checkableType="checkbox"
                    checked={checked}
                    fullWidth
                    onChange={() => toggleIntent(cat.id)}
                    css={intentGoalCardCss}
                    label={
                      <EuiFlexGroup
                        direction="column"
                        gutterSize="s"
                        alignItems="stretch"
                        responsive={false}
                      >
                        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <strong>{intentTitle(cat.id)}</strong>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <IntentGoalLogoStack services={servicesForIntentCategory(cat)} />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiText size="xs" color="subdued">
                          <p>{intentDescription(cat.id)}</p>
                        </EuiText>
                      </EuiFlexGroup>
                    }
                  />
                );
              })}
            </div>
            <EuiSpacer size="l" />
            <div
              css={css`
                position: relative;
                text-align: center;
                margin-bottom: ${euiTheme.size.m};
              `}
            >
              <EuiHorizontalRule
                margin="none"
                css={css`
                  position: absolute;
                  top: 50%;
                  transform: translateY(-50%);
                `}
              />
              <span
                css={css`
                  position: relative;
                  background-color: ${euiTheme.colors.backgroundBasePlain};
                  padding: 0 ${euiTheme.size.s};
                `}
              >
                <EuiButtonEmpty
                  data-test-subj="observabilityOnboardingStepsSelectIndividualServicesDividerButton"
                  size="s"
                  iconType={individualServicesOpen ? 'arrowUp' : 'arrowDown'}
                  iconSide="right"
                  onClick={() => setIndividualServicesOpen((v) => !v)}
                >
                  {individualServicesOpen
                    ? i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step2.hideIndividualServices',
                        {
                          defaultMessage: 'Hide individual services',
                        }
                      )
                    : i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step2.selectIndividualServices',
                        {
                          defaultMessage: 'Select individual services',
                        }
                      )}
                </EuiButtonEmpty>
              </span>
            </div>
            <EuiSpacer size="m" />
            {individualServicesOpen ? (
              <EuiPanel
                paddingSize="none"
                data-test-subj="awsOnboardingStep2IndividualServicesPanel"
                {...awsIndividualServicesPanelProps}
              >
                <div
                  css={css`
                    padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s}
                      ${euiTheme.size.m};
                  `}
                >
                  <EuiFieldSearch
                    data-test-subj="observabilityOnboardingStepsFieldSearch"
                    fullWidth
                    placeholder={i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.step2.search',
                      {
                        defaultMessage: 'Search AWS services…',
                      }
                    )}
                    value={powerSearch}
                    onChange={(e) => setPowerSearch(e.target.value)}
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
                        disabled={sortedPowerGridServices.length === 0}
                        onClick={() => {
                          setManualServiceIds((prev) => {
                            const next = new Set(prev);
                            const allVisibleSelected =
                              sortedPowerGridServices.length > 0 &&
                              sortedPowerGridServices.every((s) => next.has(s.id));
                            if (allVisibleSelected) {
                              for (const svc of sortedPowerGridServices) {
                                next.delete(svc.id);
                              }
                            } else {
                              for (const svc of sortedPowerGridServices) {
                                next.add(svc.id);
                              }
                            }
                            return next;
                          });
                        }}
                      >
                        {allFilteredPowerGridServicesSelected
                          ? i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step2.deselectAll',
                              {
                                defaultMessage: 'Deselect all',
                              }
                            )
                          : i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step2.selectAll',
                              {
                                defaultMessage: 'Select all',
                              }
                            )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
                <AwsServicePickerScrollArea>
                  <div css={awsServicePickerGridCss}>
                    {powerGridServicesDisplayOrder.map((svc) => {
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
                                  <p style={{ margin: 0 }}>{svc.description}</p>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          }
                        />
                      );
                    })}
                  </div>
                </AwsServicePickerScrollArea>
              </EuiPanel>
            ) : null}
          </>
        ),
      },
      {
        title: i18n.translate('xpack.observabilityOnboarding.awsPage.step3.title', {
          defaultMessage: 'Review and deploy',
        }),
        children: (
          <>
            <EuiText size="s" color="subdued">
              <p>
                {hasRoleCredentials
                  ? i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.step3.descriptionValueRole',
                      {
                        defaultMessage:
                          'Elastic will use your IAM role and the {count, plural, one {# service you selected} other {# services you selected}} to ingest AWS telemetry. When that data is flowing, you can open the AWS integration to explore dashboards and configuration in one place.',
                        values: { count: resolvedServices.length },
                      }
                    )
                  : i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.step3.descriptionValueKeys',
                      {
                        defaultMessage:
                          'Elastic will use your access keys and the {count, plural, one {# service you selected} other {# services you selected}} to ingest AWS telemetry. When that data is flowing, you can open the AWS integration to explore dashboards and configuration in one place.',
                        values: { count: resolvedServices.length },
                      }
                    )}
              </p>
              <p>
                {i18n.translate('xpack.observabilityOnboarding.awsPage.step3.descriptionDataGate', {
                  defaultMessage:
                    'The button below stays inactive until we detect documents in your AWS logs or metrics data streams.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="observabilityOnboardingStepsSeeMyAwsDataButton"
              fill
              iconType="popout"
              iconSide="right"
              disabled={!awsObservabilityDataReceived}
              title={
                !awsObservabilityDataReceived
                  ? i18n.translate(
                      'xpack.observabilityOnboarding.awsPage.step3.seeMyAwsDataDisabledHint',
                      {
                        defaultMessage:
                          'Waiting for AWS data in Elasticsearch. This can take a few minutes after collection starts.',
                      }
                    )
                  : undefined
              }
              {...(awsObservabilityDataReceived
                ? { href: integrationsAwsHref, target: '_blank' as const }
                : {})}
            >
              {i18n.translate('xpack.observabilityOnboarding.awsPage.step3.seeMyAwsData', {
                defaultMessage: 'See my AWS data',
              })}
            </EuiButton>
          </>
        ),
      },
    ],
    [
      allFilteredPowerGridServicesSelected,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsServicePickerGridCss,
      canContinueStep1,
      docIamRole,
      euiTheme.colors.backgroundBasePlain,
      euiTheme.breakpoint.m,
      euiTheme.size.m,
      euiTheme.size.s,
      hasRoleCredentials,
      iamRoleArn,
      integrationsAwsHref,
      manualServiceIds,
      individualServicesOpen,
      awsObservabilityDataReceived,
      awsIndividualServicesPanelProps,
      powerSearch,
      resolvedServices,
      selectedIntentIds,
      powerGridServicesDisplayOrder,
      sortedPowerGridServices,
      toggleIntent,
    ]
  );

  return (
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
      <EuiSteps css={stepsCss} steps={steps} />
    </PageTemplate>
  );
};
