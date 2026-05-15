/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  type EuiSuperSelectOption,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export const AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME = 'awsOnboardingSuperSelectMenuItem';

export const AWS_EDOT_CLOUD_FORWARDER_DOC_HREF =
  'https://www.elastic.co/docs/reference/opentelemetry/edot-cloud-forwarder/aws';

export const AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL =
  'https://elastic-cloudformation.s3.amazonaws.com/firehose.yaml';

export type AwsFirehoseSetupPathId = 'console' | 'cli';

export type AwsAgentBasedHostTargetId = 'new_hosts' | 'existing_hosts';

export interface AwsCloudForwarderLogSource {
  readonly id: string;
  readonly bucket: string;
  readonly logType: string;
  readonly region: string;
}

export function awsFirehoseConsoleQuickCreateHref(): string {
  const query = new URLSearchParams({
    templateURL: AWS_FIREHOSE_CLOUDFORMATION_TEMPLATE_URL,
    stackName: 'elastic-firehose',
  });
  return `https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?${query.toString()}`;
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

export const AwsCloudForwarderLogSourcesPanel: React.FC<{
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

export const AwsFirehoseSetupPanel: React.FC<{
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

export const AwsAgentBasedSetupPanel: React.FC<{
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
