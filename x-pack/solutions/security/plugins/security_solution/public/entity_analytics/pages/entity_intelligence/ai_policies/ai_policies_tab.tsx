/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type {
  AiPolicy,
  AiPolicyInput,
} from '../../../../../common/entity_intelligence/ai_policies';
import { ProviderIcon } from '../ai_agents/provider_icon';
import { AgentTimestamp } from '../ai_agents/agent_evidence';
import { SecurityFindingsPanel } from '../security_findings/security_findings_panel';
import type { SecurityFindingsPanelProps } from '../security_findings/security_findings_panel';
import { PolicyEditor } from './policy_editor';
import { PolicyCoverage } from './policy_coverage';
import {
  editablePolicy,
  policyActivityLabels,
  policyProviderLabels,
  policySeverityLabels,
  policyTemplates,
} from './policy_form';
import { useAiPolicies } from './use_ai_policies';

export const AiPoliciesTab: React.FC<Pick<SecurityFindingsPanelProps, 'onInvestigateAgent'>> = ({
  onInvestigateAgent,
}) => {
  const { euiTheme } = useEuiTheme();
  const policies = useAiPolicies();
  const [editor, setEditor] = useState<{ initial?: AiPolicyInput; existing?: AiPolicy }>();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();
  const findingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedPolicyId) findingsRef.current?.scrollIntoView({ block: 'start' });
  }, [selectedPolicyId]);
  const selectedPolicy = policies.policies.find(({ id }) => id === selectedPolicyId);
  const startEditing = (value: { initial?: AiPolicyInput; existing?: AiPolicy }) => {
    policies.clearSaveError();
    setEditor(value);
  };
  const cards = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
    gap: ${euiTheme.size.m};
  `;
  return (
    <div data-test-subj="aiPoliciesWorkspace">
      <EuiPanel
        hasShadow={false}
        paddingSize="l"
        css={css`
          background: linear-gradient(
            120deg,
            ${transparentize(euiTheme.colors.primary, 0.12)},
            ${transparentize(euiTheme.colors.accent, 0.05)}
          );
          border: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="shield" size="xl" color="primary" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2>
                    {i18n.translate('xpack.securitySolution.entityIntelligence.policies.title', {
                      defaultMessage: 'AI policies',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              <p>
                {i18n.translate('xpack.securitySolution.entityIntelligence.policies.subtitle', {
                  defaultMessage:
                    'Define risky tool activity. Follow each match from its policy to the agent, session, and exact call.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="refresh"
                  isLoading={policies.isRefreshing}
                  onClick={policies.refresh}
                >
                  {i18n.translate('xpack.securitySolution.entityIntelligence.policies.refresh', {
                    defaultMessage: 'Refresh',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="plusCircle"
                  onClick={() => startEditing({})}
                  data-test-subj="aiPolicyCreate"
                >
                  {i18n.translate('xpack.securitySolution.entityIntelligence.policies.create', {
                    defaultMessage: 'Create policy',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup gutterSize="l" alignItems="center" wrap>
          {[
            {
              icon: 'controls',
              text: i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.step.policy',
                { defaultMessage: '1. Create a policy' }
              ),
            },
            {
              icon: 'commandLine',
              text: i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.step.activity',
                { defaultMessage: '2. Run a tool in your agent' }
              ),
            },
            {
              icon: 'inspect',
              text: i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.step.finding',
                { defaultMessage: '3. Investigate the finding' }
              ),
            },
          ].map(({ icon, text }) => (
            <EuiFlexItem grow={false} key={text}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiIcon type={icon} color="primary" aria-hidden={true} />
                <EuiText size="s">
                  <strong>{text}</strong>
                </EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary" iconType="eye">
              {i18n.translate('xpack.securitySolution.entityIntelligence.policies.detectOnly', {
                defaultMessage: 'Detect only · actions are not blocked',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="l" />
      <PolicyCoverage
        data={policies.detector}
        loading={policies.detectorLoading}
        unavailable={policies.detectorUnavailable}
        enabledProviders={
          policies.isLoading || policies.unavailable
            ? undefined
            : [
                ...new Set(
                  policies.policies
                    .filter((policy) => policy.enabled)
                    .flatMap((policy) => policy.providers)
                ),
              ]
        }
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.securitySolution.entityIntelligence.policies.library', {
                defaultMessage: 'Policy library',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {policies.total !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.securitySolution.entityIntelligence.policies.count', {
                defaultMessage: '{count, plural, one {# saved policy} other {# saved policies}}',
                values: { count: policies.total },
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {policies.saveError && !editor && (
        <>
          <KbnDangerCallout announceOnMount title={policies.saveError} />
          <EuiSpacer />
        </>
      )}
      {policies.isLoading ? (
        <EuiSkeletonText lines={5} />
      ) : policies.unavailable ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('xpack.securitySolution.entityIntelligence.policies.loadError', {
            defaultMessage: 'Policies could not be loaded. Refresh to retry.',
          })}
        />
      ) : policies.policies.length === 0 ? (
        <EuiEmptyPrompt
          iconType="shield"
          title={
            <h3>
              {i18n.translate('xpack.securitySolution.entityIntelligence.policies.empty.title', {
                defaultMessage: 'Start with the behavior you want to detect',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.securitySolution.entityIntelligence.policies.empty.body', {
                defaultMessage:
                  'Choose a template below or create a policy for your own tool activity.',
              })}
            </p>
          }
        />
      ) : (
        <div css={cards}>
          {policies.policies.map((policy) => (
            <EuiPanel
              key={policy.id}
              hasBorder
              hasShadow={false}
              paddingSize="l"
              data-test-subj="aiPolicyCard"
              css={css`
                border-top: ${euiTheme.border.width.thick} solid
                  ${policy.enabled ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
              `}
            >
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    {policyActivityLabels[policy.activityType]}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={
                      policy.severity === 'high' || policy.severity === 'critical'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {policySeverityLabels[policy.severity]}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiTitle size="xs">
                <h4>{policy.name}</h4>
              </EuiTitle>
              {policy.description && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    <p>{policy.description}</p>
                  </EuiText>
                </>
              )}
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="m" wrap>
                {policy.providers.map((provider) => (
                  <EuiFlexItem grow={false} key={provider}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <ProviderIcon
                        provider={provider === 'agent_builder' ? 'elastic' : provider}
                        size={20}
                      />
                      <EuiText size="xs">{policyProviderLabels[provider]}</EuiText>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
                {policy.toolNames.length > 0 && (
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityIntelligence.policies.match.tool',
                        { defaultMessage: 'Tool is ' }
                      )}
                      <EuiCode>{policy.toolNames.join(', ')}</EuiCode>
                    </p>
                  </EuiText>
                )}
                {policy.toolNames.length > 0 && policy.inputContains && (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiText size="xs" color="subdued">
                      <strong>
                        {i18n.translate(
                          'xpack.securitySolution.entityIntelligence.policies.match.and',
                          { defaultMessage: 'AND' }
                        )}
                      </strong>
                    </EuiText>
                    <EuiSpacer size="xs" />
                  </>
                )}
                {policy.inputContains && (
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityIntelligence.policies.match.input',
                        { defaultMessage: 'Input contains ' }
                      )}
                      <EuiCode>{policy.inputContains}</EuiCode>
                    </p>
                  </EuiText>
                )}
              </EuiPanel>
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('xpack.securitySolution.entityIntelligence.policies.revision', {
                    defaultMessage: 'Revision {version} · Effective ',
                    values: { version: policy.version },
                  })}
                  <AgentTimestamp value={policy.effectiveFrom} />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    compressed
                    checked={policy.enabled}
                    disabled={policies.isSaving}
                    onChange={() =>
                      void policies.save(
                        { ...editablePolicy(policy), enabled: !policy.enabled },
                        policy
                      )
                    }
                    label={
                      policy.enabled
                        ? i18n.translate(
                            'xpack.securitySolution.entityIntelligence.policies.enabled',
                            { defaultMessage: 'Enabled' }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityIntelligence.policies.disabled',
                            { defaultMessage: 'Disabled' }
                          )
                    }
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityIntelligence.policies.toggleLabel',
                      { defaultMessage: 'Enable policy {name}', values: { name: policy.name } }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        iconType="pencil"
                        onClick={() =>
                          startEditing({ initial: editablePolicy(policy), existing: policy })
                        }
                      >
                        {i18n.translate('xpack.securitySolution.entityIntelligence.policies.edit', {
                          defaultMessage: 'Edit',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        iconType="inspect"
                        onClick={() => setSelectedPolicyId(policy.id)}
                      >
                        {i18n.translate(
                          'xpack.securitySolution.entityIntelligence.policies.findings',
                          { defaultMessage: 'View findings' }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ))}
        </div>
      )}
      <EuiSpacer size="l" />
      {selectedPolicy && (
        <div ref={findingsRef}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate(
                      'xpack.securitySolution.entityIntelligence.policies.findingsFor',
                      {
                        defaultMessage: 'Findings for {name}',
                        values: { name: selectedPolicy.name },
                      }
                    )}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  size="s"
                  onClick={() => setSelectedPolicyId(undefined)}
                >
                  {i18n.translate(
                    'xpack.securitySolution.entityIntelligence.policies.closeFindings',
                    { defaultMessage: 'Close findings' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
          <SecurityFindingsPanel
            scope={{ type: 'policy', policyId: selectedPolicy.id }}
            onInvestigateAgent={onInvestigateAgent}
          />
          <EuiSpacer size="l" />
        </div>
      )}
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.securitySolution.entityIntelligence.policies.templates', {
            defaultMessage: 'Start from a template',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        {policyTemplates.map((template) => (
          <EuiFlexItem key={template.input.activityType}>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              <EuiIcon type={template.icon} size="l" color="primary" aria-hidden={true} />
              <EuiSpacer size="s" />
              <EuiTitle size="xxs">
                <h4>{template.input.name}</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>{template.description}</p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="s"
                iconType="plusCircle"
                onClick={() => startEditing({ initial: template.input })}
              >
                {i18n.translate('xpack.securitySolution.entityIntelligence.policies.useTemplate', {
                  defaultMessage: 'Use template',
                })}
              </EuiButtonEmpty>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {editor && (
        <PolicyEditor
          initial={editor.initial}
          existing={editor.existing}
          saving={policies.isSaving}
          error={policies.saveError}
          onSave={policies.save}
          onClose={() => {
            if (!policies.isSaving) setEditor(undefined);
          }}
        />
      )}
    </div>
  );
};
