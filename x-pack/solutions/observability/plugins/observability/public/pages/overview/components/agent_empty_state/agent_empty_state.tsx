/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCard,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKibana } from '../../../../utils/kibana_react';
import integrationsHeaderImg from './assets/integrations-header.png';
import apiEndpointHeaderImg from './assets/api-endpoint-header.png';
import platformMigrationHeaderImg from './assets/platform-migration-header.png';

const LOGO_FALLBACK = 'https://www.vectorlogo.zone/logos';

const OBSERVABILITY_ONBOARDING_APP_ID = 'observabilityOnboarding';

type CardId =
  | 'monitor-cloud'
  | 'monitor-containers'
  | 'monitor-hosts'
  | 'instrument-apps'
  | 'platform-migration';

const CARD_PLACEHOLDERS: Record<CardId, string> = {
  'monitor-cloud': i18n.translate(
    'xpack.observability.overview.agentEmptyState.card.monitorCloud.placeholder',
    { defaultMessage: 'Which cloud provider do you want to monitor?' }
  ),
  'monitor-containers': i18n.translate(
    'xpack.observability.overview.agentEmptyState.card.monitorContainers.placeholder',
    { defaultMessage: 'What containerized environment do you want to observe?' }
  ),
  'monitor-hosts': i18n.translate(
    'xpack.observability.overview.agentEmptyState.card.monitorHosts.placeholder',
    { defaultMessage: 'What kind of hosts or servers do you want to monitor?' }
  ),
  'instrument-apps': i18n.translate(
    'xpack.observability.overview.agentEmptyState.card.instrumentApps.placeholder',
    { defaultMessage: 'Which application or service do you want to instrument?' }
  ),
  'platform-migration': i18n.translate(
    'xpack.observability.overview.agentEmptyState.card.platformMigration.placeholder',
    { defaultMessage: 'Which platform are you migrating from?' }
  ),
};

interface CardStep {
  id: string;
  label: string;
  placeholder: string;
  logo?: string;
  dataTypeQuestion?: string;
  dataTypes?: Array<{ id: string; label: string }>;
  serviceQuestion?: string;
  services?: Array<{ id: string; label: string }>;
}

const ELASTIC_INTEGRATION_LOGOS =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages';

const StepLogo: React.FC<{ src: string }> = ({ src }) => {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{ width: 20, height: 20, objectFit: 'contain' }}
      onError={() => setErrored(true)}
    />
  );
};

const CARD_STEPS: Record<CardId, CardStep[]> = {
  'monitor-cloud': [
    {
      id: 'aws',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws',
        { defaultMessage: 'Amazon Web Services' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.placeholder',
        { defaultMessage: 'Which AWS services do you want to collect logs and metrics from?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/aws/img/logo_aws.svg`,
      dataTypeQuestion: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.dataTypeQuestion',
        {
          defaultMessage:
            'What types of data do you want to collect from AWS?',
        }
      ),
      dataTypes: [
        {
          id: 'metrics',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.dataType.metrics',
            { defaultMessage: 'Metrics' }
          ),
        },
        {
          id: 'logs',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.dataType.logs',
            { defaultMessage: 'Logs' }
          ),
        },
        {
          id: 'traces',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.dataType.traces',
            { defaultMessage: 'Traces' }
          ),
        },
        {
          id: 'something-else',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.dataType.somethingElse',
            { defaultMessage: 'Something else' }
          ),
        },
      ],
      serviceQuestion: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.serviceQuestion',
        { defaultMessage: 'Which services are you running?' }
      ),
      services: [
        {
          id: 'ec2',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.service.ec2',
            { defaultMessage: 'EC2' }
          ),
        },
        {
          id: 'rds',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.service.rds',
            { defaultMessage: 'RDS' }
          ),
        },
        {
          id: 's3',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.service.s3',
            { defaultMessage: 'S3' }
          ),
        },
        {
          id: 'lambda',
          label: i18n.translate(
            'xpack.observability.overview.agentEmptyState.step.monitorCloud.aws.service.lambda',
            { defaultMessage: 'Lambda' }
          ),
        },
      ],
    },
    {
      id: 'gcp',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.gcp',
        { defaultMessage: 'Google Cloud Platform' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.gcp.placeholder',
        { defaultMessage: 'Which GCP services or projects do you want to monitor?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/gcp/img/logo_gcp.svg`,
    },
    {
      id: 'azure',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.azure',
        { defaultMessage: 'Azure' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorCloud.azure.placeholder',
        { defaultMessage: 'Which Azure services do you want to centralize monitoring for?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/azure/img/logo_azure.svg`,
    },
  ],
  'monitor-containers': [
    {
      id: 'kubernetes',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorContainers.kubernetes',
        { defaultMessage: 'Kubernetes' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorContainers.kubernetes.placeholder',
        { defaultMessage: 'Which Kubernetes clusters or workloads do you want to observe?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/kubernetes/img/logo_kubernetes.svg`,
    },
    {
      id: 'docker',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorContainers.docker',
        { defaultMessage: 'Docker' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorContainers.docker.placeholder',
        { defaultMessage: 'Which Docker containers do you want to collect logs and metrics from?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/docker/img/logo_docker.svg`,
    },
    {
      id: 'ecs',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorContainers.ecs',
        { defaultMessage: 'Amazon ECS' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorContainers.ecs.placeholder',
        { defaultMessage: 'Which ECS clusters or Fargate tasks do you want to track?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/aws/img/logo_ecs.svg`,
    },
  ],
  'monitor-hosts': [
    {
      id: 'linux',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorHosts.linux',
        { defaultMessage: 'Linux' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorHosts.linux.placeholder',
        { defaultMessage: 'How many Linux servers do you want to monitor, and what are they running?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/system/img/logo_system.svg`,
    },
    {
      id: 'windows',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorHosts.windows',
        { defaultMessage: 'Windows' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorHosts.windows.placeholder',
        { defaultMessage: 'Which Windows event logs or performance counters do you want to monitor?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/windows/img/logo_windows.svg`,
    },
    {
      id: 'macos',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorHosts.macos',
        { defaultMessage: 'macOS' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.monitorHosts.macos.placeholder',
        { defaultMessage: 'What logs or metrics do you want to collect from macOS endpoints?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/macos/img/macos-logo.svg`,
    },
  ],
  'instrument-apps': [
    {
      id: 'opentelemetry',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.instrumentApps.opentelemetry',
        { defaultMessage: 'OpenTelemetry' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.instrumentApps.opentelemetry.placeholder',
        { defaultMessage: 'Which services or languages do you want to instrument with OTel?' }
      ),
      logo: 'https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png',
    },
    {
      id: 'prometheus',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.instrumentApps.prometheus',
        { defaultMessage: 'Prometheus' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.instrumentApps.prometheus.placeholder',
        { defaultMessage: 'Which Prometheus endpoints or exporters do you want to scrape?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/prometheus/img/logo_prometheus.svg`,
    },
    {
      id: 'fluentbit',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.instrumentApps.fluentbit',
        { defaultMessage: 'Fluent Bit' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.instrumentApps.fluentbit.placeholder',
        { defaultMessage: 'What log sources do you want to forward via Fluent Bit?' }
      ),
      logo: 'https://www.vectorlogo.zone/logos/fluentd/fluentd-icon.svg',
    },
  ],
  'platform-migration': [
    {
      id: 'datadog',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.datadog',
        { defaultMessage: 'Datadog' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.datadog.placeholder',
        { defaultMessage: 'What are you currently monitoring in Datadog?' }
      ),
      logo: 'https://www.vectorlogo.zone/logos/datadoghq/datadoghq-icon.svg',
    },
    {
      id: 'splunk',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.splunk',
        { defaultMessage: 'Splunk' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.splunk.placeholder',
        { defaultMessage: 'What data do you store in Splunk today?' }
      ),
      logo: 'https://www.vectorlogo.zone/logos/splunk/splunk-icon.svg',
    },
    {
      id: 'new-relic',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.newRelic',
        { defaultMessage: 'New Relic' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.newRelic.placeholder',
        { defaultMessage: 'What are you monitoring with New Relic?' }
      ),
      logo: 'https://www.vectorlogo.zone/logos/newrelic/newrelic-icon.svg',
    },
    {
      id: 'prometheus-grafana',
      label: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.prometheus',
        { defaultMessage: 'Prometheus / Grafana' }
      ),
      placeholder: i18n.translate(
        'xpack.observability.overview.agentEmptyState.step.platformMigration.prometheus.placeholder',
        { defaultMessage: 'What metrics are you collecting with Prometheus or Grafana?' }
      ),
      logo: `${ELASTIC_INTEGRATION_LOGOS}/prometheus/img/logo_prometheus.svg`,
    },
  ],
};

const CARDS: Array<{ id: CardId; path: string; title: string; description: string; hidden?: boolean }> = [
  {
    id: 'monitor-cloud',
    path: '/ingest-hub/cloud',
    title: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.monitorCloud.title',
      { defaultMessage: 'Monitor cloud' }
    ),
    description: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.monitorCloud.description',
      { defaultMessage: 'Collect logs and metrics from AWS, GCP, or Azure' }
    ),
  },
  {
    id: 'monitor-containers',
    path: '/ingest-hub/containers',
    title: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.monitorContainers.title',
      { defaultMessage: 'Monitor containers' }
    ),
    description: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.monitorContainers.description',
      { defaultMessage: 'Observe Kubernetes, Docker, or ECS containerized environments' }
    ),
  },
  {
    id: 'monitor-hosts',
    path: '/ingest-hub/host',
    title: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.monitorHosts.title',
      { defaultMessage: 'Monitor hosts' }
    ),
    description: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.monitorHosts.description',
      { defaultMessage: 'Collect system metrics and logs from Linux, Windows, or macOS servers' }
    ),
  },
  {
    id: 'instrument-apps',
    path: '/ingest-hub/apm',
    title: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.instrumentApps.title',
      { defaultMessage: 'Instrument apps' }
    ),
    description: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.instrumentApps.description',
      { defaultMessage: 'Send traces, metrics, and logs via OpenTelemetry, Prometheus, or Fluent Bit' }
    ),
  },
  {
    id: 'platform-migration',
    path: '/ingest-hub/platform-migration',
    title: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.platformMigration.title',
      { defaultMessage: 'Migrate platforms' }
    ),
    description: i18n.translate(
      'xpack.observability.overview.agentEmptyState.card.platformMigration.description',
      { defaultMessage: 'Move your existing monitoring to Elastic from Datadog, Splunk, or others' }
    ),
    hidden: true,
  },
];


const AGENT_EMPTY_STATE_TITLE_OPTIONS = [
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.yourDataReady',
    defaultMessage: 'Your data, ready to explore',
  },
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.everythingYouNeed',
    defaultMessage: 'Everything you need to get started',
  },
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.turnDataIntoAnswers',
    defaultMessage: 'Turn your data into answers',
  },
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.welcomeObservability',
    defaultMessage: 'Welcome to Observability',
  },
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.whatMonitoring',
    defaultMessage: 'What are you monitoring today?',
  },
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.tellUsWorkingWith',
    defaultMessage: "Tell us what you're working with",
  },
  {
    i18nId: 'xpack.observability.overview.agentEmptyState.title.dataToInsights',
    defaultMessage: 'From data to insights',
  },
] as const;

const agentEmptyStateTitleReveal = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

const stepWidgetSlideUp = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 16px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

/** Same as `conversationElementWidthStyles` max width in `agent_builder/.../conversation.styles.ts`. */
const AGENT_BUILDER_CONVERSATION_MAX_WIDTH_PX = 800;

const ANIMATED_PLACEHOLDERS = [
  'How do I monitor my AWS infrastructure?',
  'How do I set up Kubernetes cluster monitoring?',
  'How do I collect logs from my Linux servers?',
  'How can I trace requests across my microservices?',
  'How do I detect anomalies in my metrics?',
  'How can I migrate my dashboards to Elastic?',
  'How do I monitor my Docker containers?',
  'How can I set up alerting for my services?',
  'How do I monitor my GCP or Azure resources?',
  'How do I instrument my Node.js application?',
];

const placeholderFadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
`;

const placeholderFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export function AgentEmptyState(): React.ReactElement {
  const { application, agentBuilder, security, streamsApp } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const titleVariantIndex = AGENT_EMPTY_STATE_TITLE_OPTIONS.findIndex(
    (o) => o.i18nId === 'xpack.observability.overview.agentEmptyState.title.welcomeObservability'
  );
  const titleOption = AGENT_EMPTY_STATE_TITLE_OPTIONS[titleVariantIndex];
  const titleText = i18n.translate(titleOption.i18nId, {
    defaultMessage: titleOption.defaultMessage,
  });
  const titleHeadingStyles = useMemo(
    () => css`
      ${euiCanAnimate} {
        animation: ${agentEmptyStateTitleReveal} ${euiTheme.animation.slow} ease-out both;
      }
    `,
    [euiTheme.animation.slow]
  );

  const [currentUserFirstName, setCurrentUserFirstName] = useState<string | null>(null);
  useEffect(() => {
    security?.authc
      .getCurrentUser()
      .then((user) => {
        const displayName = user.full_name || user.username;
        setCurrentUserFirstName(displayName.split(' ')[0]);
      })
      .catch(() => {});
  }, [security]);

  const AgentConversationInput = useMemo(
    () => agentBuilder?.getConversationInput(),
    [agentBuilder]
  );

  const [selectedCardIds, setSelectedCardIds] = useState<CardId[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedDataTypeIds, setSelectedDataTypeIds] = useState<string[]>([]);
  const [somethingElseText, setSomethingElseText] = useState('');
  const [showServicesStep, setShowServicesStep] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceSearchText, setServiceSearchText] = useState('');

  useEffect(() => {
    setSelectedDataTypeIds([]);
    setSomethingElseText('');
    setShowServicesStep(false);
    setSelectedServiceIds([]);
    setServiceSearchText('');
  }, [selectedStepId]);

  const toggleDataType = useCallback((dtId: string) => {
    setSelectedDataTypeIds((prev) =>
      prev.includes(dtId) ? prev.filter((id) => id !== dtId) : [...prev, dtId]
    );
  }, []);

  const toggleService = useCallback((serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  }, []);

  const toggleCard = useCallback((cardId: CardId) => {
    setSelectedCardIds((prev) => (prev.includes(cardId) ? [] : [cardId]));
    setSelectedStepId(null);
  }, []);

  const onAttachmentRemoved = useCallback(() => {
    setSelectedCardIds([]);
    setSelectedStepId(null);
  }, []);

  const selectedAttachments = useMemo(() => {
    if (selectedCardIds.length === 0) return [];
    const cardId = selectedCardIds[0];
    if (selectedStepId) {
      const step = CARD_STEPS[cardId].find((s) => s.id === selectedStepId);
      if (step)
        return [
          {
            id: selectedStepId,
            type: step.label,
            data: { dataTypes: selectedDataTypeIds.length > 0 ? selectedDataTypeIds : undefined },
          },
        ];
    }
    const card = CARDS.find((c) => c.id === cardId)!;
    return [{ id: cardId, type: card.title, data: {} }];
  }, [selectedCardIds, selectedStepId, selectedDataTypeIds]);

  const activePlaceholder = useMemo(() => {
    if (selectedCardIds.length === 0) return undefined;
    const cardId = selectedCardIds[0];
    if (selectedStepId) {
      const step = CARD_STEPS[cardId].find((s) => s.id === selectedStepId);
      return step?.placeholder;
    }
    return CARD_PLACEHOLDERS[cardId];
  }, [selectedCardIds, selectedStepId]);

  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const stepPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCardIds.length > 0 || !AgentConversationInput) return;
    const FADE_DURATION = 350;
    const interval = setInterval(() => {
      // Phase 1: fade out the current text
      setIsExiting(true);
      // Phase 2: swap text and fade in
      const swapTimer = setTimeout(() => {
        setDisplayedIndex((i) => (i + 1) % ANIMATED_PLACEHOLDERS.length);
        setIsExiting(false);
      }, FADE_DURATION);
      return () => clearTimeout(swapTimer);
    }, 3800);
    return () => clearInterval(interval);
  }, [selectedCardIds.length, AgentConversationInput]);

  // Unique CSS per (index, phase) forces Emotion to generate a new class name,
  // which restarts the ::placeholder animation on every transition.
  const animatedInputCss = useMemo(
    () => css`
      /* placeholder-anim: ${displayedIndex}-${isExiting ? 'out' : 'in'} */
      textarea::placeholder,
      input::placeholder {
        animation: ${isExiting ? placeholderFadeOut : placeholderFadeIn} 0.35s ease both;
      }
    `,
    [displayedIndex, isExiting]
  );

  useEffect(() => {
    if (selectedCardIds.length === 0 || !stepPanelRef.current) return;
    stepPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedCardIds, selectedStepId]);

  const navigateToIngest = (path: string) => {
    application?.navigateToApp(OBSERVABILITY_ONBOARDING_APP_ID, { path });
  };

  const [isDataCatalogFlyoutOpen, setIsDataCatalogFlyoutOpen] = useState(false);
  const DataSourcesCatalogFlyout = streamsApp?.DataSourcesCatalogFlyout;

  return (
    <>
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      gutterSize="none"
      css={{ width: '100%' }}
      data-test-subj="obltOverviewAgentEmptyState"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type="logoObservability"
                  size="original"
                  aria-hidden={true}
                  css={[
                    titleHeadingStyles,
                    css`
                      width: 24px;
                      height: 24px;
                    `,
                  ]}
                  data-test-subj="obltOverviewAgentEmptyStateLogo"
                />
              </EuiFlexItem>
              {currentUserFirstName && (
                <EuiFlexItem grow={false}>
                  <EuiText
                    css={[
                      titleHeadingStyles,
                      css`
                        font-size: 24px;
                        line-height: 1;
                      `,
                    ]}
                  >
                    {i18n.translate(
                      'xpack.observability.overview.agentEmptyState.greeting',
                      {
                        defaultMessage: 'Hi, {name}!',
                        values: { name: currentUserFirstName },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiFlexItem grow={false}>
            <EuiTitle size="l" textAlign="center">
              <h2
                css={titleHeadingStyles}
                data-test-subj={`obltOverviewAgentEmptyStateTitle-${titleVariantIndex}`}
              >
                {titleText}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiSpacer size="xl" />

      {AgentConversationInput && (
        <EuiFlexItem
          grow={false}
          css={{ width: '100%', maxWidth: AGENT_BUILDER_CONVERSATION_MAX_WIDTH_PX }}
          data-test-subj="obltOverviewAgentEmptyStatePromptWrapper"
        >
          <div
            css={[
              activePlaceholder === undefined ? animatedInputCss : undefined,
            ]}
          >
          <AgentConversationInput
            sessionTag="observability-overview"
            newConversation={true}
            attachments={selectedAttachments as any}
            onAttachmentRemoved={onAttachmentRemoved}
            placeholder={activePlaceholder ?? ANIMATED_PLACEHOLDERS[displayedIndex]}
          />
          </div>

          {selectedCardIds.length > 0 && (
            <div
              ref={stepPanelRef}
              css={css`
                margin-top: ${euiTheme.size.s};
              `}
            >
              <EuiPanel
                hasBorder
                paddingSize="none"
                css={css`
                  border-radius: 16px;
                  overflow: hidden;
                `}
              >
                {/* Header */}
                {(() => {
                  const cardId = selectedCardIds[0];
                  const activeStep = selectedStepId
                    ? CARD_STEPS[cardId].find((s) => s.id === selectedStepId)
                    : null;
                  const isDetailView = Boolean(activeStep?.dataTypes) && !showServicesStep;
                  const isServicesView = showServicesStep && Boolean(activeStep?.services);
                  return (
                    <div
                      css={css`
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}
                          ${euiTheme.size.l};
                        border-bottom: ${isDetailView || isServicesView
                          ? `1px solid ${euiTheme.colors.borderBaseSubdued}`
                          : 'none'};
                      `}
                    >
                      <EuiText size="s">
                        <strong>
                          {isServicesView
                            ? activeStep!.serviceQuestion
                            : isDetailView
                            ? activeStep!.dataTypeQuestion
                            : CARD_PLACEHOLDERS[selectedCardIds[0]]}
                        </strong>
                      </EuiText>
                      <EuiButtonIcon
                        iconType="cross"
                        aria-label={i18n.translate(
                          'xpack.observability.overview.agentEmptyState.stepWidget.close',
                          { defaultMessage: 'Close' }
                        )}
                        color="text"
                        size="xs"
                        onClick={() => {
                          setSelectedCardIds([]);
                          setSelectedStepId(null);
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Options list or detail view */}
                {(() => {
                  const cardId = selectedCardIds[0];
                  const activeStep = selectedStepId
                    ? CARD_STEPS[cardId].find((s) => s.id === selectedStepId)
                    : null;

                  if (showServicesStep && activeStep?.services) {
                    const filteredServices = serviceSearchText.trim()
                      ? activeStep.services.filter((s) =>
                          s.label.toLowerCase().includes(serviceSearchText.toLowerCase())
                        )
                      : activeStep.services;
                    return (
                      <>
                        <div
                          css={css`
                            padding: ${euiTheme.size.s} ${euiTheme.size.m};
                          `}
                        >
                          <EuiFieldSearch
                            compressed
                            fullWidth
                            placeholder={i18n.translate(
                              'xpack.observability.overview.agentEmptyState.services.searchPlaceholder',
                              { defaultMessage: 'Search services…' }
                            )}
                            value={serviceSearchText}
                            onChange={(e) => setServiceSearchText(e.target.value)}
                            aria-label={i18n.translate(
                              'xpack.observability.overview.agentEmptyState.services.searchAriaLabel',
                              { defaultMessage: 'Search AWS services' }
                            )}
                            data-test-subj="obltOverviewAgentEmptyStateServiceSearch"
                          />
                        </div>
                        <EuiListGroup flush bordered={false} gutterSize="none" maxWidth={false}>
                          {filteredServices.map((service) => {
                            const isChecked = selectedServiceIds.includes(service.id);
                            return (
                              <EuiListGroupItem
                                key={service.id}
                                size="s"
                                isActive={isChecked}
                                onClick={() => toggleService(service.id)}
                                label={
                                  <EuiFlexGroup
                                    alignItems="center"
                                    gutterSize="m"
                                    responsive={false}
                                  >
                                    <EuiFlexItem grow={false}>
                                      <div
                                        css={css`
                                          width: 28px;
                                          display: flex;
                                          align-items: center;
                                          justify-content: center;
                                          flex-shrink: 0;
                                        `}
                                      >
                                        <EuiCheckbox
                                          id={`obltOverviewAgentEmptyStateService-${service.id}`}
                                          checked={isChecked}
                                          onChange={() => toggleService(service.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={service.label}
                                        />
                                      </div>
                                    </EuiFlexItem>
                                    <EuiFlexItem>
                                      <EuiText size="s">{service.label}</EuiText>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                }
                                css={css`
                                  padding: ${euiTheme.size.m} ${euiTheme.size.m}
                                    ${euiTheme.size.m} ${euiTheme.size.l};
                                  border-bottom: 1px solid
                                    ${euiTheme.colors.borderBaseSubdued};
                                `}
                                data-test-subj={`obltOverviewAgentEmptyStateService-${service.id}`}
                              />
                            );
                          })}
                          <EuiListGroupItem
                            key="discover-automatically"
                            size="s"
                            onClick={() => {
                              setSelectedCardIds([]);
                              setSelectedStepId(null);
                              setShowServicesStep(false);
                            }}
                            label={
                              <EuiFlexGroup
                                alignItems="center"
                                gutterSize="m"
                                responsive={false}
                              >
                                <EuiFlexItem grow={false}>
                                  <div
                                    css={css`
                                      width: 28px;
                                      height: 28px;
                                      border-radius: ${euiTheme.border.radius.medium};
                                      background: ${euiTheme.colors.backgroundBaseSubdued};
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      flex-shrink: 0;
                                    `}
                                  >
                                    <EuiIcon type="search" size="s" color="subdued" />
                                  </div>
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <EuiText size="s">
                                    {i18n.translate(
                                      'xpack.observability.overview.agentEmptyState.services.discoverAutomatically',
                                      { defaultMessage: 'Discover my services automatically' }
                                    )}
                                  </EuiText>
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiIcon type="arrowRight" color="subdued" size="s" />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            }
                            css={css`
                              padding: ${euiTheme.size.m} ${euiTheme.size.m}
                                ${euiTheme.size.m} ${euiTheme.size.l};
                            `}
                            data-test-subj="obltOverviewAgentEmptyStateDiscoverAutomatically"
                          />
                        </EuiListGroup>
                      </>
                    );
                  }

                  if (activeStep?.dataTypes) {
                    return (
                      <EuiListGroup flush bordered={false} gutterSize="none" maxWidth={false}>
                        {activeStep.dataTypes
                          .filter((dt) => dt.id !== 'something-else')
                          .map((dt) => {
                            const isChecked = selectedDataTypeIds.includes(dt.id);
                            return (
                              <EuiListGroupItem
                                key={dt.id}
                                size="s"
                                isActive={isChecked}
                                onClick={() => toggleDataType(dt.id)}
                                label={
                                  <EuiFlexGroup
                                    alignItems="center"
                                    gutterSize="m"
                                    responsive={false}
                                  >
                                    <EuiFlexItem grow={false}>
                                      <div
                                        css={css`
                                          width: 28px;
                                          display: flex;
                                          align-items: center;
                                          justify-content: center;
                                          flex-shrink: 0;
                                        `}
                                      >
                                        <EuiCheckbox
                                          id={`obltOverviewAgentEmptyStateDataType-${dt.id}`}
                                          checked={isChecked}
                                          onChange={() => toggleDataType(dt.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={dt.label}
                                        />
                                      </div>
                                    </EuiFlexItem>
                                    <EuiFlexItem>
                                      <EuiText size="s">{dt.label}</EuiText>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                }
                                css={css`
                                  padding: ${euiTheme.size.m} ${euiTheme.size.m}
                                    ${euiTheme.size.m} ${euiTheme.size.l};
                                  border-bottom: 1px solid
                                    ${euiTheme.colors.borderBaseSubdued};
                                `}
                                data-test-subj={`obltOverviewAgentEmptyStateDataType-${dt.id}`}
                              />
                            );
                          })}
                        {/* Something else — pencil badge + native input, same as step list */}
                        <EuiListGroupItem
                          key="something-else"
                          size="s"
                          onClick={() => {}}
                          label={
                            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                              <EuiFlexItem grow={false}>
                                <div
                                  css={css`
                                    width: 28px;
                                    height: 28px;
                                    border-radius: ${euiTheme.border.radius.medium};
                                    background: ${euiTheme.colors.backgroundBaseSubdued};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    flex-shrink: 0;
                                  `}
                                >
                                  <EuiIcon type="pencil" size="s" color="subdued" />
                                </div>
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText size="s">
                                  <input
                                    type="text"
                                    placeholder={i18n.translate(
                                      'xpack.observability.overview.agentEmptyState.stepDetail.somethingElse',
                                      { defaultMessage: 'Something else' }
                                    )}
                                    aria-label={i18n.translate(
                                      'xpack.observability.overview.agentEmptyState.stepDetail.somethingElseLabel',
                                      { defaultMessage: 'Something else' }
                                    )}
                                    value={somethingElseText}
                                    onChange={(e) => setSomethingElseText(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    css={css`
                                      width: 100%;
                                      border: none;
                                      outline: none;
                                      background: transparent;
                                      box-shadow: none;
                                      padding: 0;
                                      margin: 0;
                                      font-size: inherit;
                                      line-height: inherit;
                                      color: inherit;
                                      font-family: inherit;
                                      &::placeholder {
                                        color: ${euiTheme.colors.subduedText};
                                      }
                                      &:focus {
                                        outline: none;
                                        box-shadow: none;
                                      }
                                    `}
                                    data-test-subj="obltOverviewAgentEmptyStateDetailSomethingElseInput"
                                  />
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          }
                          css={css`
                            padding: ${euiTheme.size.m} ${euiTheme.size.m}
                              ${euiTheme.size.m} ${euiTheme.size.l};
                            &:focus-within {
                              background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                            }
                          `}
                          data-test-subj="obltOverviewAgentEmptyStateDetailSomethingElseItem"
                        />
                      </EuiListGroup>
                    );
                  }

                  return (
                    <EuiListGroup flush bordered={false} gutterSize="none" maxWidth={false}>
                      {CARD_STEPS[cardId].map((step, index) => {
                        const isSelected = selectedStepId === step.id;
                        return (
                          <EuiListGroupItem
                            key={step.id}
                            size="s"
                            isActive={isSelected}
                            onClick={() =>
                              setSelectedStepId((prev) => (prev === step.id ? null : step.id))
                            }
                            label={
                              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                                <EuiFlexItem grow={false}>
                                  <div
                                    css={css`
                                      width: 28px;
                                      height: 28px;
                                      border-radius: ${euiTheme.border.radius.medium};
                                      background: ${euiTheme.colors.backgroundBaseSubdued};
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      flex-shrink: 0;
                                      overflow: hidden;
                                    `}
                                  >
                                    {step.logo ? (
                                      <StepLogo src={step.logo} />
                                    ) : (
                                      <EuiText size="xs" color="subdued">
                                        <strong>{index + 1}</strong>
                                      </EuiText>
                                    )}
                                  </div>
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <EuiText size="s">{step.label}</EuiText>
                                </EuiFlexItem>
                                {isSelected && (
                                  <EuiFlexItem grow={false}>
                                    <EuiIcon type="arrowRight" color="subdued" size="s" />
                                  </EuiFlexItem>
                                )}
                              </EuiFlexGroup>
                            }
                            css={css`
                              padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}
                                ${euiTheme.size.l};
                              border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
                            `}
                            data-test-subj={`obltOverviewAgentEmptyStateStep-${step.id}`}
                          />
                        );
                      })}
                      {/* Something else — always last, same layout as steps above */}
                      <EuiListGroupItem
                        key="something-else"
                        size="s"
                        onClick={() => {}}
                        label={
                          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <div
                                css={css`
                                  width: 28px;
                                  height: 28px;
                                  border-radius: ${euiTheme.border.radius.medium};
                                  background: ${euiTheme.colors.backgroundBaseSubdued};
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  flex-shrink: 0;
                                `}
                              >
                                <EuiIcon type="pencil" size="s" color="subdued" />
                              </div>
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiText size="s">
                                <input
                                  type="text"
                                  placeholder={i18n.translate(
                                    'xpack.observability.overview.agentEmptyState.stepWidget.somethingElse',
                                    { defaultMessage: 'Something else' }
                                  )}
                                  aria-label={i18n.translate(
                                    'xpack.observability.overview.agentEmptyState.stepWidget.somethingElseLabel',
                                    { defaultMessage: 'Something else' }
                                  )}
                                  value={somethingElseText}
                                  onChange={(e) => setSomethingElseText(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  css={css`
                                    width: 100%;
                                    border: none;
                                    outline: none;
                                    background: transparent;
                                    box-shadow: none;
                                    padding: 0;
                                    margin: 0;
                                    font-size: inherit;
                                    line-height: inherit;
                                    color: inherit;
                                    font-family: inherit;
                                    &::placeholder {
                                      color: ${euiTheme.colors.subduedText};
                                    }
                                    &:focus {
                                      outline: none;
                                      box-shadow: none;
                                    }
                                  `}
                                  data-test-subj="obltOverviewAgentEmptyStateSomethingElseInput"
                                />
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        }
                        css={css`
                          padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}
                            ${euiTheme.size.l};
                          &:focus-within {
                            background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                          }
                        `}
                        data-test-subj="obltOverviewAgentEmptyStateSomethingElseItem"
                      />
                    </EuiListGroup>
                  );
                })()}

                {/* Footer — shown for detail/services view always; shown for step list when somethingElseText has content */}
                {(() => {
                  const cardId = selectedCardIds[0];
                  const footerStep = selectedStepId
                    ? CARD_STEPS[cardId].find((s) => s.id === selectedStepId)
                    : null;
                  const isServicesFooter = showServicesStep && Boolean(footerStep?.services);
                  const isDetailFooter = Boolean(footerStep?.dataTypes) && !showServicesStep;
                  const hasSomethingElse = somethingElseText.trim().length > 0;
                  const isNextEnabled = isServicesFooter
                    ? selectedServiceIds.length > 0
                    : isDetailFooter
                    ? selectedDataTypeIds.length > 0 || hasSomethingElse
                    : hasSomethingElse;
                  if (!isDetailFooter && !isServicesFooter && !hasSomethingElse) return null;
                  const handleNext = () => {
                    if (isDetailFooter && footerStep?.services) {
                      setShowServicesStep(true);
                    } else {
                      setSelectedCardIds([]);
                      setSelectedStepId(null);
                      setShowServicesStep(false);
                    }
                  };
                  return (
                    <>
                      <EuiHorizontalRule margin="none" />
                      <div
                        css={css`
                          display: flex;
                          align-items: center;
                          padding: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}
                            ${euiTheme.size.l};
                          gap: ${euiTheme.size.m};
                        `}
                      >
                        <div
                          css={css`
                            flex: 1;
                            min-width: 0;
                          `}
                        >
                          {isDetailFooter && (
                            <EuiText size="s" color="subdued">
                              {i18n.translate(
                                'xpack.observability.overview.agentEmptyState.stepDetail.selectedCount',
                                {
                                  defaultMessage:
                                    '{count, plural, one {# selected} other {# selected}}',
                                  values: {
                                    count:
                                      selectedDataTypeIds.length +
                                      (hasSomethingElse ? 1 : 0),
                                  },
                                }
                              )}
                            </EuiText>
                          )}
                          {isServicesFooter && selectedServiceIds.length > 0 && (
                            <EuiText size="s" color="subdued">
                              {i18n.translate(
                                'xpack.observability.overview.agentEmptyState.services.selectedCount',
                                {
                                  defaultMessage:
                                    '{count, plural, one {# selected} other {# selected}}',
                                  values: { count: selectedServiceIds.length },
                                }
                              )}
                            </EuiText>
                          )}
                        </div>

                        {/* Right side — always pushed to the right */}
                        <div
                          css={css`
                            display: flex;
                            align-items: center;
                            gap: ${euiTheme.size.xs};
                            flex-shrink: 0;
                          `}
                        >
                          {(isDetailFooter || isServicesFooter) && (
                            <EuiButtonEmpty
                              size="s"
                              color="text"
                              onClick={() => {
                                setSelectedCardIds([]);
                                setSelectedStepId(null);
                                setShowServicesStep(false);
                              }}
                            >
                              {i18n.translate(
                                'xpack.observability.overview.agentEmptyState.stepWidget.skip',
                                { defaultMessage: 'Skip' }
                              )}
                            </EuiButtonEmpty>
                          )}
                          <EuiButtonIcon
                            iconType="arrowRight"
                            display="fill"
                            size="m"
                            isDisabled={!isNextEnabled}
                            onClick={handleNext}
                            aria-label={i18n.translate(
                              'xpack.observability.overview.agentEmptyState.stepWidget.next',
                              { defaultMessage: 'Next' }
                            )}
                            data-test-subj="obltOverviewAgentEmptyStateNextButton"
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </EuiPanel>
            </div>
          )}
        </EuiFlexItem>
      )}

      {selectedCardIds.length === 0 && (
        <EuiFlexItem
          grow={false}
          css={{ width: '100%', maxWidth: AGENT_BUILDER_CONVERSATION_MAX_WIDTH_PX }}
        >
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" wrap={true} responsive={false} justifyContent="center">
            {CARDS.filter((c) => !c.hidden).map(({ id, title }) => (
              <EuiFlexItem key={id} grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color="text"
                  css={css`
                    border: 1px solid
                      ${selectedCardIds.includes(id)
                        ? euiTheme.colors.primary
                        : euiTheme.colors.borderBaseSubdued};
                    border-radius: 8px;
                    font-weight: ${euiTheme.font.weight.medium};
                    white-space: nowrap;
                    color: ${selectedCardIds.includes(id)
                      ? euiTheme.colors.primary
                      : 'inherit'};
                    transition: border-color ${euiTheme.animation.fast},
                      color ${euiTheme.animation.fast},
                      background ${euiTheme.animation.fast};
                    &:hover {
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                    }
                  `}
                  onClick={() => toggleCard(id)}
                  data-test-subj={`obltOverviewAgentEmptyStateCard-${id}`}
                >
                  {title}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {selectedCardIds.length === 0 && (
        <EuiFlexItem
          grow={false}
          css={{ width: '100%', maxWidth: AGENT_BUILDER_CONVERSATION_MAX_WIDTH_PX }}
        >
          <EuiHorizontalRule margin="xl" />
        </EuiFlexItem>
      )}

      {/* Onboarding action cards */}
      {selectedCardIds.length === 0 && (
      <EuiFlexItem
        grow={false}
        css={{ width: '100%', maxWidth: AGENT_BUILDER_CONVERSATION_MAX_WIDTH_PX }}
      >
        <EuiFlexGroup gutterSize="m" responsive={false}>
          {[
            {
              img: integrationsHeaderImg,
              title: 'Add integrations',
              description: 'Connect logs, metrics, and traces from any source.',
              onClick: () => setIsDataCatalogFlyoutOpen(true),
            },
            {
              img: platformMigrationHeaderImg,
              title: 'Migrate your platform',
              description: 'Switch from Splunk, Datadog, or others.',
              onClick: () => navigateToIngest('/platform-migration'),
            },
            {
              img: apiEndpointHeaderImg,
              title: 'Connect via API',
              description: 'Send data with REST API or OpenTelemetry.',
              onClick: () => navigateToIngest('/integrations?category=api-ingestion'),
            },
          ].map(({ img, title, description, onClick }) => (
            <EuiFlexItem key={title}>
              <EuiCard
                title={title}
                titleElement="h4"
                titleSize="xs"
                description={description}
                hasBorder
                paddingSize="m"
                onClick={onClick}
                layout="horizontal"
                icon={
                  <div
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                      borderRadius: 8,
                    }}
                  >
                    <img src={img} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  </div>
                }
                css={css`
                  height: 100%;
                  cursor: pointer;
                  .euiCard__top {
                    align-self: flex-start;
                    margin-top: 0;
                  }
                `}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        {/* "Not ready" footer */}
        <div css={css`margin-top: ${euiTheme.size.xl}; text-align: center;`}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="center" responsive wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <strong>Not ready to add your data?</strong>{' '}
                Explore a fully loaded sample Observability environment before setting up.
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                href="https://www.elastic.co/start"
                target="_blank"
                rel="noopener noreferrer"
                iconType="popout"
                iconSide="right"
              >
                Explore Demo
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlexItem>
      )}

      <EuiSpacer size="xl" />
    </EuiFlexGroup>

    {isDataCatalogFlyoutOpen && DataSourcesCatalogFlyout && (
      <DataSourcesCatalogFlyout
        onClose={() => setIsDataCatalogFlyoutOpen(false)}
        onDataConnected={() => setIsDataCatalogFlyoutOpen(false)}
      />
    )}
  </>
  );
}
