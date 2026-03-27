/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiCheckbox,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiSteps,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { CardLogoIcon } from './ingest_hub_components';

const FALCON_LOGO = 'https://companieslogo.com/img/orig/CRWD-442a5e7d.png?t=1720244491';

type SourceId = 'falcon-api' | 'falcon-fdr' | 'falcon-data-replicator' | 'falcon-event-stream';
type DeploymentMethod = 'agentless' | 'elastic-agent' | 'cloud-forwarder';

interface FalconSource {
  id: SourceId;
  name: string;
  description: React.ReactNode;
  deployments: DeploymentMethod[];
  defaultDeployment: DeploymentMethod;
}

const SOURCES: FalconSource[] = [
  {
    id: 'falcon-api',
    name: 'Falcon Logs via REST API',
    description: <>Investigate alerts, track hosts and vulnerabilities<br />via CrowdStrike REST API</>,
    deployments: ['agentless', 'elastic-agent'],
    defaultDeployment: 'agentless',
  },
  {
    id: 'falcon-event-stream',
    name: 'Falcon Logs via Event Stream',
    description: <>Detect and respond to threats as they happen<br />via CrowdStrike Event Streams API</>,
    deployments: ['elastic-agent'],
    defaultDeployment: 'elastic-agent',
  },
  {
    id: 'falcon-fdr',
    name: 'Falcon & FDR Logs',
    description: <>Collect events from an existing SIEM connector setup<br />&nbsp;</>,
    deployments: ['cloud-forwarder'],
    defaultDeployment: 'cloud-forwarder',
  },
  {
    id: 'falcon-data-replicator',
    name: 'Falcon Data Replicator Logs',
    description: <>Archive and analyse large-scale endpoint telemetry<br />from CrowdStrike-managed S3 buckets</>,
    deployments: ['elastic-agent'],
    defaultDeployment: 'elastic-agent',
  },
];

const DEPLOYMENT_LABEL: Record<DeploymentMethod, string> = {
  agentless: 'Agentless',
  'elastic-agent': 'Elastic Agent',
  'cloud-forwarder': 'Cloud Forwarder',
};

const DEPLOYMENT_DESCRIPTION: Record<DeploymentMethod, string> = {
  agentless: 'Connect directly without deploying any infrastructure. Fastest to set up.',
  'elastic-agent': 'Deploy Elastic Agent on your host to collect and ship data.',
  'cloud-forwarder': 'Forward data from CrowdStrike cloud storage via SQS and S3.',
};

const DEPLOYMENT_ICON: Record<DeploymentMethod, string> = {
  agentless: 'cloud',
  'elastic-agent': 'agentApp',
  'cloud-forwarder': 'exportAction',
};

const DEPLOYMENT_ORDER: DeploymentMethod[] = ['agentless', 'cloud-forwarder', 'elastic-agent'];

// ── Config forms ──────────────────────────────────────────────────────────────

interface ConfigState {
  clientId: string;
  clientSecret: string;
  cloudRegion: string;
  s3Bucket: string;
  sqsUrl: string;
  awsRegion: string;
}

const AgentlessForm: React.FC<{
  config: ConfigState;
  onChange: (p: Partial<ConfigState>) => void;
  connecting: boolean;
  connected: boolean;
  onTest: () => void;
}> = ({ config, onChange, connecting, connected, onTest }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFormRow label="Client ID" fullWidth>
        <EuiFieldText
          fullWidth
          placeholder="e.g. abc123def456"
          value={config.clientId}
          onChange={(e) => onChange({ clientId: e.target.value })}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label="Client Secret" fullWidth>
        <EuiFieldPassword
          fullWidth
          placeholder="Enter your API client secret"
          value={config.clientSecret}
          onChange={(e) => onChange({ clientSecret: e.target.value })}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label="Cloud region" fullWidth>
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          {(['US-1', 'US-2', 'EU-1', 'US-GOV-1'] as const).map((r) => (
            <EuiFlexItem key={r} grow={false}>
              <button
                type="button"
                onClick={() => onChange({ cloudRegion: r })}
                css={css`
                  padding: 5px 12px;
                  border-radius: 6px;
                  border: 1px solid ${
                    config.cloudRegion === r
                      ? euiTheme.colors.primary
                      : euiTheme.colors.borderBaseSubdued
                  };
                  background: ${
                    config.cloudRegion === r
                      ? euiTheme.colors.backgroundBasePrimary
                      : 'transparent'
                  };
                  color: ${config.cloudRegion === r ? euiTheme.colors.primary : euiTheme.colors.textSubdued};
                  font-size: 13px;
                  font-weight: ${config.cloudRegion === r ? 600 : 400};
                  cursor: pointer;
                  transition: all 0.1s;
                `}
              >
                {r}
              </button>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="l" />
      {connected ? (
        <EuiCallOut title="Connection verified" color="success" iconType="checkInCircleFilled" size="s">
          <EuiText size="s"><p>Elastic can reach your CrowdStrike environment.</p></EuiText>
        </EuiCallOut>
      ) : (
        <EuiButton
          size="s"
          onClick={onTest}
          isLoading={connecting}
          disabled={!config.clientId || !config.clientSecret}
          iconType="link"
        >
          {connecting ? 'Testing connection…' : 'Test connection'}
        </EuiButton>
      )}
    </>
  );
};

const CloudForwarderForm: React.FC<{
  config: ConfigState;
  onChange: (p: Partial<ConfigState>) => void;
}> = ({ config, onChange }) => (
  <>
    <EuiFormRow label="S3 bucket name" fullWidth>
      <EuiFieldText
        fullWidth
        placeholder="e.g. crowdstrike-fdr-bucket"
        value={config.s3Bucket}
        onChange={(e) => onChange({ s3Bucket: e.target.value })}
      />
    </EuiFormRow>
    <EuiSpacer size="m" />
    <EuiFormRow label="SQS queue URL" fullWidth>
      <EuiFieldText
        fullWidth
        placeholder="https://sqs.us-east-1.amazonaws.com/123456789012/queue"
        value={config.sqsUrl}
        onChange={(e) => onChange({ sqsUrl: e.target.value })}
      />
    </EuiFormRow>
    <EuiSpacer size="m" />
    <EuiFormRow label="AWS region" fullWidth>
      <EuiFieldText
        fullWidth
        placeholder="us-east-1"
        value={config.awsRegion}
        onChange={(e) => onChange({ awsRegion: e.target.value })}
      />
    </EuiFormRow>
  </>
);

const ElasticAgentForm: React.FC<{
  connecting: boolean;
  connected: boolean;
  onTest: () => void;
  policyName: string;
  onPolicyNameChange: (v: string) => void;
  activeTab: 'new' | 'existing';
  onActiveTabChange: (v: 'new' | 'existing') => void;
}> = ({ connecting, connected, onTest, policyName, onPolicyNameChange, activeTab, onActiveTabChange }) => {
  const [collectSystemLogs, setCollectSystemLogs] = React.useState(true);

  return (
    <>
      <EuiTabs>
        <EuiTab isSelected={activeTab === 'new'} onClick={() => onActiveTabChange('new')}>
          New hosts
        </EuiTab>
        <EuiTab isSelected={activeTab === 'existing'} onClick={() => onActiveTabChange('existing')}>
          Existing hosts
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="l" />

      {activeTab === 'new' && (
        <EuiFlexGroup gutterSize="xl" responsive={false}>
          <EuiFlexItem grow={false} css={{ minWidth: 220, maxWidth: 260 }}>
            <EuiText size="s">
              <strong>Create agent policy</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>Add this integration to a new set of hosts by creating a new agent policy. You can add agent in the next step.</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="New agent policy name" fullWidth>
              <EuiFieldText
                fullWidth
                value={policyName}
                onChange={(e) => onPolicyNameChange(e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiCheckbox
              id="collect-system-logs"
              label="Collect system logs and metrics"
              checked={collectSystemLogs}
              onChange={(e) => setCollectSystemLogs(e.target.checked)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {activeTab === 'existing' && (
        <EuiFlexGroup gutterSize="xl" responsive={false}>
          <EuiFlexItem grow={false} css={{ minWidth: 220, maxWidth: 260 }}>
            <EuiText size="s">
              <strong>Add to existing policy</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>Add this integration to an existing agent policy. The agent will be updated automatically.</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Existing agent policy" fullWidth>
              <EuiFieldText fullWidth placeholder="Select agent policy…" />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

    </>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface CrowdStrikeFlyoutProps {
  onClose: () => void;
}

export const CrowdStrikeFlyout: React.FC<CrowdStrikeFlyoutProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();

  const [selectedId, setSelectedId] = useState<SourceId | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  const [dataReady, setDataReady] = useState(false);
  const [testDone, setTestDone] = useState(false);
  const [testConnecting, setTestConnecting] = useState(false);
  const [sharedMethod, setSharedMethod] = useState<DeploymentMethod | null>(null);
  const [agentlessClientId, setAgentlessClientId] = useState('');
  const [agentlessClientSecret, setAgentlessClientSecret] = useState('');
  const [agentlessApiUrl, setAgentlessApiUrl] = useState('https://api.crowdstrike.com');
  const [agentlessTokenUrl, setAgentlessTokenUrl] = useState('https://api.crowdstrike.com/oauth2/token');
  const [agentlessProxyUrl, setAgentlessProxyUrl] = useState('');
  const [agentlessAdvancedOpen, setAgentlessAdvancedOpen] = useState(false);
  const [agentPolicyName, setAgentPolicyName] = useState('Agent policy 1');
  const [agentActiveTab, setAgentActiveTab] = useState<'new' | 'existing'>('new');
  const [deploymentDone, setDeploymentDone] = useState(false);
  const [done, setDone] = useState(false);
  const [config, setConfig] = useState<ConfigState>({
    clientId: '', clientSecret: '', cloudRegion: 'US-1',
    s3Bucket: '', sqsUrl: '', awsRegion: 'us-east-1',
  });
  const [connecting, setConnecting] = useState<DeploymentMethod | null>(null);
  const [connected, setConnected] = useState<Set<DeploymentMethod>>(new Set());

  const selectedSource = useMemo(
    () => SOURCES.find((s) => s.id === selectedId) ?? null,
    [selectedId]
  );

  // Available deployment methods for the selected source (sorted by DEPLOYMENT_ORDER)
  const availableMethods = useMemo((): DeploymentMethod[] => {
    if (!selectedSource) return [];
    return DEPLOYMENT_ORDER.filter((m) => selectedSource.deployments.includes(m));
  }, [selectedSource]);

  // Effective method: user choice if still valid for this source, else source default
  const effectiveMethod: DeploymentMethod | null = useMemo(() => {
    if (!selectedSource) return null;
    if (sharedMethod && selectedSource.deployments.includes(sharedMethod)) return sharedMethod;
    return selectedSource.defaultDeployment;
  }, [selectedSource, sharedMethod]);

  const needsCredentialsStep = useMemo(() => {
    if (selectedId === 'falcon-api' || selectedId === 'falcon-data-replicator') return true;
    // falcon-event-stream only needs credentials when using Elastic Agent; agentless skips it
    if (selectedId === 'falcon-event-stream' && effectiveMethod === 'elastic-agent') return true;
    return false;
  }, [selectedId, effectiveMethod]);

  const handleTest = (method: DeploymentMethod) => {
    setConnecting(method);
    setTimeout(() => {
      setConnecting(null);
      setConnected((prev) => new Set(prev).add(method));
    }, 2000);
  };

  const handleSelectSource = (id: SourceId) => {
    setSelectedId(id);
    setSharedMethod(null);
    setDeploymentDone(false);
    setTestDone(false);
    setTestConnecting(false);
    setAgentPolicyName('Agent policy 1');
    setAgentActiveTab('new');
    setConnected(new Set());
    setDataReady(false);
    setTimeout(() => setDataReady(true), 8000);
  };

  // ── Step 1: Source selection ─────────────────────────────────────────────────
  const renderSourceCard = (src: FalconSource) => (
    <EuiFlexItem key={src.id} style={{ flexBasis: 'calc(50% - 4px)', minWidth: 0, display: 'flex' }}>
      <EuiCheckableCard
        css={css`width: 100%; height: 100%;`}
        id={`source-${src.id}`}
        label={
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <img
                src={FALCON_LOGO}
                alt="CrowdStrike"
                style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }}
              />
            </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s"><strong>{src.name}</strong></EuiText>
                    </EuiFlexItem>
                    {src.id === 'falcon-api' && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="accent">Recommended</EuiBadge>
                      </EuiFlexItem>
                    )}
                    {src.id === 'falcon-data-replicator' && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="warning">Requires AWS</EuiBadge>
                      </EuiFlexItem>
                    )}
          </EuiFlexGroup>
        }
        checkableType="radio"
        checked={selectedId === src.id}
        onChange={() => handleSelectSource(src.id)}
      >
        <EuiText size="s" color="subdued" css={css`margin-top: -4px;`}><p>{src.description}</p></EuiText>
        {src.id === 'falcon-api' && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiText size="xs" color="subdued">Needs a CrowdStrike Client ID and Secret. No extra infrastructure.</EuiText>
          </>
        )}
        {src.id === 'falcon-event-stream' && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiText size="xs" color="subdued">Needs a CrowdStrike Client ID and Secret with <strong>read:Event streams</strong> scope.</EuiText>
          </>
        )}
        {src.id === 'falcon-fdr' && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiText size="xs" color="subdued">Needs the Falcon SIEM Connector already installed and running.</EuiText>
          </>
        )}
        {src.id === 'falcon-data-replicator' && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiText size="xs" color="subdued">Needs AWS credentials and an SQS queue URL from CrowdStrike FDR.</EuiText>
          </>
        )}
      </EuiCheckableCard>
    </EuiFlexItem>
  );

  const primarySources = SOURCES.filter((s) => s.id === 'falcon-api' || s.id === 'falcon-event-stream');
  const advancedSources = SOURCES.filter((s) => s.id === 'falcon-fdr' || s.id === 'falcon-data-replicator');

  const renderSourceStep = () => (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ display: 'none' }}>Select a CrowdStrike data source</legend>
      <EuiFlexGroup direction="row" gutterSize="s" wrap responsive={false}>
        {SOURCES.map(renderSourceCard)}
      </EuiFlexGroup>
    </fieldset>
  );

  // ── Step 2: Deployment ───────────────────────────────────────────────────────
  const renderDeploymentStep = () => {
    if (!selectedSource) return null;

    const renderMethodRadios = (methods: DeploymentMethod[]) => (
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ display: 'none' }}>Select deployment method</legend>
        <EuiFlexGroup direction="row" gutterSize="s" wrap responsive={false}>
          {methods.map((m) => (
            <EuiFlexItem key={m} style={{ flexBasis: 'calc(50% - 4px)', minWidth: 0, display: 'flex' }}>
              <EuiCheckableCard
                id={`method-${m}`}
                css={css`width: 100%; height: 100%;`}
                label={
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s"><strong>{DEPLOYMENT_LABEL[m]}</strong></EuiText>
                    </EuiFlexItem>
                    {m === 'agentless' && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="accent">Recommended</EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
                checkableType="radio"
                checked={effectiveMethod === m}
                onChange={() => setSharedMethod(m)}
              >
                <EuiText size="s" color="subdued" css={css`margin-top: -4px;`}>
                  <p>{DEPLOYMENT_DESCRIPTION[m]}</p>
                </EuiText>
              </EuiCheckableCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </fieldset>
    );

    const renderConfigForm = (method: DeploymentMethod) => (
      <>
        {method === 'cloud-forwarder' && (
          <div css={css`max-width: calc(50% - 4px);`}>
            <CloudForwarderForm
              config={config}
              onChange={(p) => setConfig((prev) => ({ ...prev, ...p }))}
            />
          </div>
        )}
        {method === 'elastic-agent' && (
          <div css={css`max-width: calc(50% - 4px);`}>
            <ElasticAgentForm
              connecting={connecting === 'elastic-agent'}
              connected={connected.has('elastic-agent')}
              onTest={() => handleTest('elastic-agent')}
              policyName={agentPolicyName}
              onPolicyNameChange={setAgentPolicyName}
              activeTab={agentActiveTab}
              onActiveTabChange={setAgentActiveTab}
            />
          </div>
        )}
      </>
    );

    const isCfOnly = availableMethods.length === 1 && availableMethods[0] === 'cloud-forwarder';

    // ── Case 1: Cloud Forwarder only ──────────────────────────────────────────
    let caseContent: React.ReactNode;

    if (isCfOnly) {
      caseContent = renderConfigForm('cloud-forwarder');
    }
    // ── Case 2: Agentless / Elastic Agent ─────────────────────────────────────
    else {
      caseContent = (
        <>
          {availableMethods.length > 1 && renderMethodRadios(availableMethods)}
          {availableMethods.length > 1 && effectiveMethod && <EuiSpacer size="l" />}
          {effectiveMethod && renderConfigForm(effectiveMethod)}
        </>
      );
    }

    const singleMethodDescription =
      selectedId === 'falcon-fdr'
        ? 'Set up the Elastic Cloud Forwarder to securely ship logs from your environment to Elastic.'
        : selectedId === 'falcon-data-replicator' || selectedId === 'falcon-event-stream'
        ? 'Elastic Agent will be installed on your hosts to collect and forward CrowdStrike data to Elastic. Choose where to add this integration.'
        : null;

    return (
      <>
        {singleMethodDescription && (
          <>
            <EuiText size="s" color="subdued">
              <p>{singleMethodDescription}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}
        {caseContent}
      </>
    );
  };

  // ── Done ─────────────────────────────────────────────────────────────────────
  const renderDone = () => (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" style={{ minHeight: 400 }}>
      <EuiFlexItem grow={false}>
        <div
          css={css`
            width: 72px; height: 72px; border-radius: 50%;
            background: ${euiTheme.colors.backgroundBaseSuccess};
            display: flex; align-items: center; justify-content: center;
          `}
        >
          <EuiIcon type="checkInCircleFilled" size="xxl" color="success" />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="m"><h2 style={{ textAlign: 'center' }}>CrowdStrike added</h2></EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="m" color="subdued" style={{ textAlign: 'center', maxWidth: 380 }}>
          <p>Your CrowdStrike Falcon data is flowing into Elastic. First events may take a few minutes to appear.</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" justifyContent="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="discoverApp" onClick={onClose}>View in Discover</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );


  // ── Integration settings state ───────────────────────────────────────────────
  const [integrationName, setIntegrationName] = useState('crowdstrike-1');
  const [integrationDescription, setIntegrationDescription] = useState('');
  const [integrationNamespace, setIntegrationNamespace] = useState('default');

  // ── Step 3: Credentials ───────────────────────────────────────────────────────
  const renderCredentialsStep = () => {
    if (!selectedSource) return null;

    const crowdstrikeCredentialsForm = (includeAppId: boolean) => (
      <>
        <EuiFormRow label="Client ID" helpText="Client ID for the CrowdStrike API." fullWidth>
          <EuiFieldText fullWidth placeholder="e.g. abc123def456" value={agentlessClientId} onChange={(e) => setAgentlessClientId(e.target.value)} />
        </EuiFormRow>
        <EuiSpacer size="l" />
        <EuiPanel color="subdued" paddingSize="m" css={css`border-radius: 6px;`}>
          <EuiFormRow
            label={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>Client Secret</EuiFlexItem>
                <EuiFlexItem grow={false}><EuiIcon type="iInCircle" size="s" /></EuiFlexItem>
              </EuiFlexGroup>
            }
            helpText="Client Secret for the CrowdStrike API."
            fullWidth
          >
            <EuiFieldPassword fullWidth value={agentlessClientSecret} onChange={(e) => setAgentlessClientSecret(e.target.value)} />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiLink href="#" external>Learn more about policy secrets.</EuiLink>
        </EuiPanel>
        <EuiSpacer size="l" />
        <EuiFormRow label="URL" helpText="Base URL of the CrowdStrike API. Defaults to https://api.crowdstrike.com" fullWidth>
          <EuiFieldText fullWidth value={agentlessApiUrl} onChange={(e) => setAgentlessApiUrl(e.target.value)} />
        </EuiFormRow>
        {includeAppId && (
          <>
            <EuiSpacer size="l" />
            <EuiFormRow label="App ID" helpText="Specifies the appId parameter sent to the CrowdStrike API." fullWidth>
              <EuiFieldText fullWidth value={appId} onChange={(e) => setAppId(e.target.value)} />
            </EuiFormRow>
          </>
        )}
        <EuiSpacer size="l" />
        <EuiAccordion
          id="creds-advanced"
          forceState={agentlessAdvancedOpen ? 'open' : 'closed'}
          onToggle={() => setAgentlessAdvancedOpen(!agentlessAdvancedOpen)}
          buttonContent={<EuiText size="s" color="primary">Advanced options</EuiText>}
          arrowProps={{ css: css`color: ${euiTheme.colors.primary};` }}
        >
          <EuiSpacer size="m" />
          <EuiFormRow label="Token URL" helpText="CrowdStrike API token URL." fullWidth>
            <EuiFieldText fullWidth value={agentlessTokenUrl} onChange={(e) => setAgentlessTokenUrl(e.target.value)} />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow label="Proxy URL" labelAppend={<EuiText size="xs" color="subdued">Optional</EuiText>} fullWidth>
            <EuiFieldText fullWidth value={agentlessProxyUrl} onChange={(e) => setAgentlessProxyUrl(e.target.value)} />
          </EuiFormRow>
        </EuiAccordion>
      </>
    );

    let credentialsForm: React.ReactNode = null;
    if (selectedId === 'falcon-api') {
      credentialsForm = (
        <div css={css`max-width: calc(50% - 4px);`}>
          {crowdstrikeCredentialsForm(false)}
        </div>
      );
    } else if (selectedId === 'falcon-event-stream') {
      credentialsForm = (
        <div css={css`max-width: calc(50% - 4px);`}>
          {crowdstrikeCredentialsForm(true)}
        </div>
      );
    } else if (selectedId === 'falcon-data-replicator') {
      credentialsForm = (
        <div css={css`max-width: calc(50% - 4px);`}>
          <EuiFormRow label="Access Key ID" labelAppend={<EuiText size="xs" color="subdued">Optional</EuiText>} fullWidth>
            <EuiFieldText fullWidth value={awsAccessKeyId} onChange={(e) => setAwsAccessKeyId(e.target.value)} />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiPanel color="subdued" paddingSize="m" css={css`border-radius: 6px;`}>
            <EuiFormRow label="Secret Access Key" labelAppend={<EuiText size="xs" color="subdued">Optional</EuiText>} fullWidth>
              <EuiFieldPassword fullWidth value={awsSecretKey} onChange={(e) => setAwsSecretKey(e.target.value)} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiLink href="#" external>Learn more about policy secrets.</EuiLink>
          </EuiPanel>
          <EuiSpacer size="l" />
          <EuiPanel color="subdued" paddingSize="m" css={css`border-radius: 6px;`}>
            <EuiFormRow label="Session Token" labelAppend={<EuiText size="xs" color="subdued">Optional</EuiText>} fullWidth>
              <EuiFieldPassword fullWidth value={awsSessionToken} onChange={(e) => setAwsSessionToken(e.target.value)} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiLink href="#" external>Learn more about policy secrets.</EuiLink>
          </EuiPanel>
          <EuiSpacer size="l" />
          <EuiFormRow label="Queue URL" helpText="URL of the AWS SQS queue that messages will be received from." fullWidth>
            <EuiFieldText fullWidth value={awsQueueUrl} onChange={(e) => setAwsQueueUrl(e.target.value)} />
          </EuiFormRow>
        </div>
      );
    }

    return <>{credentialsForm}</>;
  };

  // ── Integration config state ─────────────────────────────────────────────────
  interface DataStreamCfg { enabled: boolean; initialInterval: string; interval: string; preserve: boolean; }
  const dsCfg = (init: string): DataStreamCfg => ({ enabled: true, initialInterval: init, interval: '24h', preserve: false });

  const [restApiUrl, setRestApiUrl] = useState('https://api.crowdstrike.com');
  const [alerts, setAlerts] = useState<DataStreamCfg>(dsCfg('24h'));
  const [hosts, setHosts] = useState<DataStreamCfg>(dsCfg('24h'));
  const [vulns, setVulns] = useState<DataStreamCfg>(dsCfg('2160h'));
  const [eventStreamUrl, setEventStreamUrl] = useState('https://api.crowdstrike.com');
  const [eventStreamClientId, setEventStreamClientId] = useState('');
  const [eventStreamClientSecret, setEventStreamClientSecret] = useState('');
  const [appId, setAppId] = useState('');
  const [eventStreamPreserve, setEventStreamPreserve] = useState(false);
  const [falconEventsEnabled, setFalconEventsEnabled] = useState(true);
  const [falconEventsPaths, setFalconEventsPaths] = useState('/var/log/crowdstrike/falconhoseclient/output*');
  const [fdrEnabled, setFdrEnabled] = useState(true);
  const [fdrPaths, setFdrPaths] = useState('/var/log/falcon_data_replicator.log');
  const [enrichHostMeta, setEnrichHostMeta] = useState(true);
  const [metadataTtl, setMetadataTtl] = useState('168h');
  const [fdrPreserve, setFdrPreserve] = useState(false);
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsQueueUrl, setAwsQueueUrl] = useState('');
  const [awsEnrichHost, setAwsEnrichHost] = useState(true);

  const canTestConnection = useMemo(() => {
    if (!selectedId) return false;
    if (selectedId === 'falcon-api' || selectedId === 'falcon-event-stream') {
      return agentlessClientId.trim().length > 0 && agentlessClientSecret.trim().length > 0;
    }
    if (selectedId === 'falcon-data-replicator') {
      return awsQueueUrl.trim().length > 0;
    }
    if (selectedId === 'falcon-fdr') {
      return config.s3Bucket.trim().length > 0 && config.sqsUrl.trim().length > 0;
    }
    return false;
  }, [selectedId, agentlessClientId, agentlessClientSecret, awsQueueUrl, config.s3Bucket, config.sqsUrl]);
  const [awsMetadataTtl, setAwsMetadataTtl] = useState('168h');
  const [awsPreserve, setAwsPreserve] = useState(false);

  const patchDs = (
    setter: React.Dispatch<React.SetStateAction<DataStreamCfg>>,
    patch: Partial<DataStreamCfg>
  ) => setter((prev) => ({ ...prev, ...patch }));

  // ── Step 3: Integration configuration ────────────────────────────────────────
  const renderDataStreamSection = (
    label: string,
    description: string,
    cfg: DataStreamCfg,
    onChange: (p: Partial<DataStreamCfg>) => void
  ) => (
    <EuiPanel hasBorder paddingSize="m" css={css`border-radius: 6px;`}>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false} css={css`min-width: 200px; max-width: 220px;`}>
          <EuiSwitch
            label={<EuiText size="s"><strong>{label}</strong></EuiText>}
            checked={cfg.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued"><p>{description}</p></EuiText>
        </EuiFlexItem>
        {cfg.enabled && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" responsive={false}>
              <EuiFlexItem>
                <EuiFormRow label="Initial interval" helpText="How far back to pull logs. Units: h/m/s." fullWidth>
                  <EuiFieldText
                    fullWidth
                    value={cfg.initialInterval}
                    onChange={(e) => onChange({ initialInterval: e.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label="Interval" helpText="Duration between requests." fullWidth>
                  <EuiFieldText
                    fullWidth
                    value={cfg.interval}
                    onChange={(e) => onChange({ interval: e.target.value })}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiSwitch
              label={
                <EuiText size="s">
                  Preserve original event
                  <EuiText size="xs" color="subdued">
                    Preserves a raw copy of the original event in <code>event.original</code>.
                  </EuiText>
                </EuiText>
              }
              checked={cfg.preserve}
              onChange={(e) => onChange({ preserve: e.target.checked })}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );

  const renderIntegrationStep = () => {
    if (!selectedSource) return null;

    const id = selectedSource.id;
    const wrapContent = (content: React.ReactNode) => (
      <div css={css`max-width: calc(50% - 4px);`}>{content}</div>
    );

    const sectionAccordion = (
      sectionId: string,
      title: string,
      children: React.ReactNode
    ) => {
      const isOpen = openSections[sectionId] ?? false;
      return (
        <>
          <EuiHorizontalRule margin="none" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} gutterSize="s"
            css={css`padding-block: ${euiTheme.size.m};`}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s"><strong>{title}</strong></EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType={isOpen ? 'arrowUp' : 'arrowDown'}
                iconSide="right"
                onClick={() => toggleSection(sectionId)}
              >
                Change defaults
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          {isOpen && (
            <>
              {children}
              <EuiSpacer size="m" />
            </>
          )}
        </>
      );
    };

    const integrationSettingsInline = (
      <>
        <EuiFormRow label="Integration name" fullWidth>
          <EuiFieldText fullWidth value={integrationName} onChange={(e) => setIntegrationName(e.target.value)} />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label="Description" labelAppend={<EuiText size="xs" color="subdued">Optional</EuiText>} fullWidth>
          <EuiFieldText fullWidth value={integrationDescription} onChange={(e) => setIntegrationDescription(e.target.value)} />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiAccordion
          id="integration-settings-advanced"
          buttonContent={<EuiText size="s" color="primary">Advanced options</EuiText>}
          arrowProps={{ css: css`color: ${euiTheme.colors.primary};` }}
        >
          <EuiSpacer size="m" />
          <EuiFormRow
            label="Namespace"
            helpText={<>Change the default namespace inherited from the parent agent policy. This setting changes the name of the integration&apos;s data stream. <EuiLink href="#" external>Learn more</EuiLink>.</>}
            fullWidth
          >
            <EuiFieldText fullWidth value={integrationNamespace} onChange={(e) => setIntegrationNamespace(e.target.value)} />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiText size="s"><strong>Data retention settings</strong></EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>By default all logs and metrics data are stored on the hot tier. <EuiLink href="#" external>Learn more</EuiLink> about changing the data retention policy for this integration.</p>
          </EuiText>
        </EuiAccordion>
      </>
    );

    // ── shared: CrowdStrike API Settings accordion for elastic-agent ─────────
    const apiSettingsAccordion = (includeAppId: boolean) => sectionAccordion('api-settings', 'Settings',
      <>
        <EuiFormRow label="URL" helpText="Base URL of the CrowdStrike API. Defaults to https://api.crowdstrike.com." fullWidth>
          <EuiFieldText fullWidth value={agentlessApiUrl} onChange={(e) => setAgentlessApiUrl(e.target.value)} />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label="Client ID" helpText="Client ID for the CrowdStrike API." fullWidth>
          <EuiFieldText fullWidth placeholder="e.g. abc123def456" value={agentlessClientId} onChange={(e) => setAgentlessClientId(e.target.value)} />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiPanel color="subdued" paddingSize="m" css={css`border-radius: 6px;`}>
          <EuiFormRow
            label={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>Client Secret</EuiFlexItem>
                <EuiFlexItem grow={false}><EuiIcon type="iInCircle" size="s" /></EuiFlexItem>
              </EuiFlexGroup>
            }
            helpText="Client Secret for the CrowdStrike API."
            fullWidth
          >
            <EuiFieldPassword fullWidth value={agentlessClientSecret} onChange={(e) => setAgentlessClientSecret(e.target.value)} />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiLink href="#" external>Learn more about policy secrets.</EuiLink>
        </EuiPanel>
        {includeAppId && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow label="App ID" helpText="Specifies the appId parameter sent to the CrowdStrike API." fullWidth>
              <EuiFieldText fullWidth value={appId} onChange={(e) => setAppId(e.target.value)} />
            </EuiFormRow>
          </>
        )}
      </>
    );

    // ── falcon-api: REST API data streams ─────────────────────────────────────
    if (id === 'falcon-api') {
      return wrapContent(
        <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>{integrationSettingsInline}</EuiFlexItem>
            <EuiFlexItem><EuiSpacer size="m" /></EuiFlexItem>
            <EuiFlexItem>
              {sectionAccordion('ds-alerts', 'Alerts',
                <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false} css={css`min-width: 180px; max-width: 200px;`}>
                    <EuiSwitch label={<EuiText size="s">Enabled</EuiText>} checked={alerts.enabled} onChange={(e) => patchDs(setAlerts, { enabled: e.target.checked })} />
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued"><p>Collect unified alerts from CrowdStrike Falcon.</p></EuiText>
                  </EuiFlexItem>
                  {alerts.enabled && (
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="m" responsive={false}>
                        <EuiFlexItem>
                          <EuiFormRow label="Initial interval" helpText="How far back to pull logs. Units: h/m/s." fullWidth>
                            <EuiFieldText fullWidth value={alerts.initialInterval} onChange={(e) => patchDs(setAlerts, { initialInterval: e.target.value })} />
                          </EuiFormRow>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiFormRow label="Interval" helpText="Duration between requests." fullWidth>
                            <EuiFieldText fullWidth value={alerts.interval} onChange={(e) => patchDs(setAlerts, { interval: e.target.value })} />
                          </EuiFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="s" />
                      <EuiSwitch label={<EuiText size="s">Preserve original event</EuiText>} checked={alerts.preserve} onChange={(e) => patchDs(setAlerts, { preserve: e.target.checked })} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              {sectionAccordion('ds-hosts', 'Hosts',
                <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false} css={css`min-width: 180px; max-width: 200px;`}>
                    <EuiSwitch label={<EuiText size="s">Enabled</EuiText>} checked={hosts.enabled} onChange={(e) => patchDs(setHosts, { enabled: e.target.checked })} />
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued"><p>Collect host and device inventory from CrowdStrike Falcon.</p></EuiText>
                  </EuiFlexItem>
                  {hosts.enabled && (
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="m" responsive={false}>
                        <EuiFlexItem>
                          <EuiFormRow label="Initial interval" helpText="How far back to pull logs. Units: h/m/s." fullWidth>
                            <EuiFieldText fullWidth value={hosts.initialInterval} onChange={(e) => patchDs(setHosts, { initialInterval: e.target.value })} />
                          </EuiFormRow>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiFormRow label="Interval" helpText="Duration between requests." fullWidth>
                            <EuiFieldText fullWidth value={hosts.interval} onChange={(e) => patchDs(setHosts, { interval: e.target.value })} />
                          </EuiFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="s" />
                      <EuiSwitch label={<EuiText size="s">Preserve original event</EuiText>} checked={hosts.preserve} onChange={(e) => patchDs(setHosts, { preserve: e.target.checked })} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              {sectionAccordion('ds-vulns', 'Vulnerabilities',
                <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false} css={css`min-width: 180px; max-width: 200px;`}>
                    <EuiSwitch label={<EuiText size="s">Enabled</EuiText>} checked={vulns.enabled} onChange={(e) => patchDs(setVulns, { enabled: e.target.checked })} />
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued"><p>Collect vulnerability data from CrowdStrike Falcon Spotlight.</p></EuiText>
                  </EuiFlexItem>
                  {vulns.enabled && (
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="m" responsive={false}>
                        <EuiFlexItem>
                          <EuiFormRow label="Initial interval" helpText="How far back to pull logs. Units: h/m/s." fullWidth>
                            <EuiFieldText fullWidth value={vulns.initialInterval} onChange={(e) => patchDs(setVulns, { initialInterval: e.target.value })} />
                          </EuiFormRow>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiFormRow label="Interval" helpText="Duration between requests." fullWidth>
                            <EuiFieldText fullWidth value={vulns.interval} onChange={(e) => patchDs(setVulns, { interval: e.target.value })} />
                          </EuiFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="s" />
                      <EuiSwitch label={<EuiText size="s">Preserve original event</EuiText>} checked={vulns.preserve} onChange={(e) => patchDs(setVulns, { preserve: e.target.checked })} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          <EuiFlexItem><EuiHorizontalRule margin="none" /></EuiFlexItem>
          </EuiFlexGroup>
      );
    }

    // ── falcon-event-stream: only integration settings ────────────────────────
    if (id === 'falcon-event-stream') {
      return wrapContent(integrationSettingsInline);
    }

    // ── falcon-fdr: Cloud Forwarder file system ───────────────────────────────
    if (id === 'falcon-fdr') {
      return wrapContent(
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{integrationSettingsInline}</EuiFlexItem>
          <EuiFlexItem><EuiSpacer size="m" /></EuiFlexItem>
          <EuiFlexItem>
            {sectionAccordion('fdr-falcon-events', 'Falcon events',
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false} css={css`min-width: 180px; max-width: 200px;`}>
                  <EuiSwitch label={<EuiText size="s">Enabled</EuiText>} checked={falconEventsEnabled} onChange={(e) => setFalconEventsEnabled(e.target.checked)} />
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued"><p>Collect CrowdStrike Falcon events through Falcon SIEM Connector.</p></EuiText>
                </EuiFlexItem>
                {falconEventsEnabled && (
                  <EuiFlexItem>
                    <EuiFormRow label="Paths" helpText="Location of the files where event outputs are written." fullWidth>
                      <EuiFieldText fullWidth value={falconEventsPaths} onChange={(e) => setFalconEventsPaths(e.target.value)} />
                    </EuiFormRow>
                    <EuiSpacer size="s" />
                    <EuiSwitch label={<EuiText size="s">Preserve original event</EuiText>} checked={false} onChange={() => {}} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            {sectionAccordion('fdr-replicator-logs', 'Falcon Data Replicator logs',
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false} css={css`min-width: 180px; max-width: 200px;`}>
                  <EuiSwitch label={<EuiText size="s">Enabled</EuiText>} checked={fdrEnabled} onChange={(e) => setFdrEnabled(e.target.checked)} />
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued"><p>Collect Falcon Data Replicator logs through file system.</p></EuiText>
                </EuiFlexItem>
                {fdrEnabled && (
                  <EuiFlexItem>
                    <EuiFormRow label="Paths" helpText="Location of FDR log files." fullWidth>
                      <EuiFieldText fullWidth value={fdrPaths} onChange={(e) => setFdrPaths(e.target.value)} />
                    </EuiFormRow>
                    <EuiSpacer size="m" />
                    <EuiSwitch label={<EuiText size="s">Enrich Host and User Metadata</EuiText>} checked={enrichHostMeta} onChange={(e) => setEnrichHostMeta(e.target.checked)} />
                    <EuiSpacer size="m" />
                    <EuiFormRow label="Metadata TTL" helpText="Period host metadata is considered valid. Units: h, m, s, ms." fullWidth>
                      <EuiFieldText fullWidth value={metadataTtl} onChange={(e) => setMetadataTtl(e.target.value)} />
                    </EuiFormRow>
                    <EuiSpacer size="m" />
                    <EuiSwitch label={<EuiText size="s">Preserve original event</EuiText>} checked={fdrPreserve} onChange={(e) => setFdrPreserve(e.target.checked)} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem><EuiHorizontalRule margin="none" /></EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // ── falcon-data-replicator: AWS S3 + SQS ─────────────────────────────────
    return wrapContent(
      <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>{integrationSettingsInline}</EuiFlexItem>
          <EuiFlexItem><EuiSpacer size="m" /></EuiFlexItem>
          <EuiFlexItem>
            {sectionAccordion('fdr-aws-settings', 'Falcon Data Replicator logs',
              <>
                <EuiSwitch
                  label={
                    <EuiText size="s">
                      Enrich Host and User Metadata
                      <EuiText size="xs" color="subdued">Uses data in aidmaster and userinfo to add host and user information to events.</EuiText>
                    </EuiText>
                  }
                  checked={awsEnrichHost}
                  onChange={(e) => setAwsEnrichHost(e.target.checked)}
                />
                <EuiSpacer size="m" />
                <EuiFormRow label="Metadata TTL" helpText="Period host metadata is considered valid. Units: h, m, s, ms." fullWidth>
                  <EuiFieldText fullWidth value={awsMetadataTtl} onChange={(e) => setAwsMetadataTtl(e.target.value)} />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiSwitch label={<EuiText size="s">Preserve original event</EuiText>} checked={awsPreserve} onChange={(e) => setAwsPreserve(e.target.checked)} />
              </>
            )}
          </EuiFlexItem>
          <EuiFlexItem><EuiHorizontalRule margin="none" /></EuiFlexItem>
        </EuiFlexGroup>
    );
  };

  // ── EuiSteps ─────────────────────────────────────────────────────────────────
  const hasSelection = selectedId !== null;
  const hasIntegrationStep = hasSelection;

  const renderTestConnectionStep = () => {
    const statusColor = testDone ? 'success' : testConnecting ? 'warning' : 'subdued';
    const statusLabel = testDone ? 'Connected' : testConnecting ? 'Testing...' : 'Not tested';

    const tableItems = [{
      id: 'crowdstrike',
      integration: 'CrowdStrike',
      dashboards: 12,
      discoverSessions: 4,
      ingestPipelines: 8,
    }];

    const tableColumns = [
      {
        field: 'integration',
        name: 'Integration',
        width: '160px',
        render: (name: string) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <img src={FALCON_LOGO} alt="CrowdStrike" css={css`width: 20px; height: 20px; object-fit: contain; flex-shrink: 0;`} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s"><strong>{name}</strong></EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'integration',
        name: 'Status',
        width: '140px',
        render: () => (
          <EuiBadge color={testDone ? 'success' : testConnecting ? 'warning' : 'default'}>
            {statusLabel}
          </EuiBadge>
        ),
      },
      {
        field: 'dashboards',
        name: 'Dashboards',
        width: '110px',
        render: (n: number) => testDone ? <EuiLink>{n}</EuiLink> : <EuiText size="s" color="subdued">{n}</EuiText>,
      },
      {
        field: 'discoverSessions',
        name: 'Discover sessions',
        width: '150px',
        render: (n: number) => testDone ? <EuiLink>{n}</EuiLink> : <EuiText size="s" color="subdued">{n}</EuiText>,
      },
      {
        field: 'ingestPipelines',
        name: 'Ingest pipelines',
        width: '140px',
        render: (n: number) => testDone ? <EuiLink>{n}</EuiLink> : <EuiText size="s" color="subdued">{n}</EuiText>,
      },
    ];

    return (
      <div css={css`max-width: 700px;`}>
        <EuiText size="s" color="subdued">
          <p>Once successful, dashboards, ingest pipelines, and other assets will be automatically installed.</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable
          items={tableItems}
          columns={tableColumns}
          itemId="id"
          tableLayout="auto"
        />
      </div>
    );
  };

  const credentialsStepTitle = 'Provide your credentials';
  const integrationStepTitle = 'Configure your integration';

  const euiSteps = [
    {
      title: 'Choose your data source',
      status: (hasSelection ? 'complete' : 'current') as 'complete' | 'current',
      children: renderSourceStep(),
    },
    {
      title: !hasSelection ? '' :
        selectedId === 'falcon-fdr' ? 'Deploy using Cloud Forwarder' :
        selectedId === 'falcon-data-replicator' || selectedId === 'falcon-event-stream' ? 'Deploy using Elastic Agent' :
        'Choose your deployment method',
      status: (!hasSelection ? 'loading' : testDone ? 'complete' : 'current') as 'loading' | 'complete' | 'current',
      children: hasSelection ? renderDeploymentStep() : <></>,
    },
    ...(hasSelection && needsCredentialsStep ? [{
      title: credentialsStepTitle,
      status: (testDone ? 'complete' : 'current') as 'complete' | 'current',
      children: renderCredentialsStep(),
    }] : []),
    ...(hasIntegrationStep ? [{
      title: integrationStepTitle,
      status: (testDone ? 'complete' : 'current') as 'complete' | 'current',
      children: renderIntegrationStep(),
    }] : []),
    ...(hasSelection ? [{
      title: 'Verify your connection',
      status: (testDone ? 'complete' : 'current') as 'complete' | 'current',
      children: renderTestConnectionStep(),
    }] : []),
  ];

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="crowdstrikeFlyoutTitle"
      css={css`
        inline-size: 70vw !important;
        & .euiFlyoutHeader {
          padding-block: 20px !important;
          padding-inline: 56px !important;
        }
        & .euiFlyoutBody__overflowContent {
          padding-block: 24px !important;
          padding-inline: 56px !important;
        }
        & .euiFlyoutFooter {
          padding-block: 16px !important;
          padding-inline: 56px !important;
        }
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <CardLogoIcon src={FALCON_LOGO} alt="CrowdStrike" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h1 id="crowdstrikeFlyoutTitle">CrowdStrike</h1>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>Collect CrowdStrike Falcon endpoint logs and alerts.</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {done ? renderDone() : (
          <EuiSteps
            steps={euiSteps}
            css={css`
              .euiStep__content {
                padding-block-start: 4px;
                padding-block-end: 40px;
              }
              .euiStep__titleWrapper {
                padding-block-start: 0;
              }
            `}
          />
        )}
      </EuiFlyoutBody>

      {!done && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} gutterSize="s">
            <EuiFlexItem grow={false} />
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
              {!testDone && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="arrowRight"
                    iconSide="right"
                    isLoading={testConnecting}
                    disabled={!hasSelection || !canTestConnection || testConnecting}
                    onClick={() => {
                      setTestConnecting(true);
                      setTestDone(false);
                      setTimeout(() => {
                        setTestConnecting(false);
                        setTestDone(true);
                      }, 2000);
                    }}
                  >
                    Save and test connection
                  </EuiButton>
                </EuiFlexItem>
              )}
              {testDone && (
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={() => setDone(true)}>
                    See my data
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
