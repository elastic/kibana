/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type {
  AiPolicy,
  AiPolicyInput,
  AiPolicyProvider,
} from '../../../../../common/entity_intelligence/ai_policies';
import { ProviderIcon } from '../ai_agents/provider_icon';
import {
  emptyPolicy,
  parseToolNames,
  policyActivityLabels,
  policyProviderLabels,
  policySeverityLabels,
  previewPolicyMatch,
  validatePolicy,
} from './policy_form';

const providerValues: AiPolicyProvider[] = [
  'cursor',
  'agent_builder',
  'codex',
  'claude_desktop',
  'google_adk',
];

export const PolicyEditor: React.FC<{
  initial?: AiPolicyInput;
  existing?: AiPolicy;
  saving: boolean;
  error?: string;
  onSave: (input: AiPolicyInput, existing?: AiPolicy) => Promise<boolean>;
  onClose: () => void;
}> = ({ initial, existing, saving, error, onSave, onClose }) => {
  const [form, setForm] = useState<AiPolicyInput>(initial ?? emptyPolicy());
  const [toolNames, setToolNames] = useState(form.toolNames.join(', '));
  const [attempted, setAttempted] = useState(false);
  const [previewProvider, setPreviewProvider] = useState<AiPolicyProvider>(
    form.providers[0] ?? 'cursor'
  );
  const [previewTool, setPreviewTool] = useState('');
  const [previewInput, setPreviewInput] = useState('');
  const [preview, setPreview] = useState<boolean>();
  const input = {
    ...form,
    name: form.name.trim(),
    inputContains: form.inputContains.trim(),
    toolNames: parseToolNames(toolNames),
  };
  const errors = attempted ? validatePolicy(input) : [];
  const update = (patch: Partial<AiPolicyInput>) => {
    setForm({ ...form, ...patch });
    setPreview(undefined);
  };
  const submit = async () => {
    setAttempted(true);
    if (validatePolicy(input).length) return;
    if (await onSave(input, existing)) onClose();
  };
  const enabledLabel = i18n.translate(
    'xpack.securitySolution.entityIntelligence.policies.editor.enabled',
    { defaultMessage: 'Enable this policy' }
  );
  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby="aiPolicyEditorTitle"
      data-test-subj="aiPolicyEditor"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiBadge color="primary" iconType="eye">
          {i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.mode', {
            defaultMessage: 'Detect only',
          })}
        </EuiBadge>
        <EuiSpacer size="s" />
        <EuiTitle size="m">
          <h2 id="aiPolicyEditorTitle">
            {existing
              ? i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.edit', {
                  defaultMessage: 'Edit AI policy',
                })
              : i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.create', {
                  defaultMessage: 'Create AI policy',
                })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.modeHelp', {
              defaultMessage:
                'Create a finding when a recorded tool call matches. The agent action is not blocked.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <>
            <KbnDangerCallout announceOnMount title={error} role="alert" />
            <EuiSpacer />
          </>
        )}
        <EuiForm
          component="form"
          fullWidth
          isInvalid={errors.length > 0}
          error={errors}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <EuiFormRow
            id="aiPolicyNameField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.name',
              { defaultMessage: 'Policy name' }
            )}
            fullWidth
          >
            <EuiFieldText
              value={form.name}
              onChange={(event) => update({ name: event.target.value })}
              maxLength={120}
              fullWidth
              data-test-subj="aiPolicyName"
            />
          </EuiFormRow>
          <EuiFormRow
            id="aiPolicyDescriptionField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.description',
              { defaultMessage: 'Description' }
            )}
            fullWidth
          >
            <EuiTextArea
              value={form.description}
              onChange={(event) => update({ description: event.target.value })}
              maxLength={1000}
              rows={2}
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer />
          <EuiFormRow
            id="aiPolicySourcesField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.providers',
              { defaultMessage: 'Agent sources' }
            )}
            fullWidth
          >
            <EuiFlexGroup gutterSize="l" wrap>
              {providerValues.map((provider) => (
                <EuiFlexItem key={provider} grow={false}>
                  <EuiCheckbox
                    id={`aiPolicyProvider-${provider}`}
                    checked={form.providers.includes(provider)}
                    onChange={(event) =>
                      update({
                        providers: event.target.checked
                          ? [...form.providers, provider]
                          : form.providers.filter((value) => value !== provider),
                      })
                    }
                    label={
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        <ProviderIcon
                          provider={provider === 'agent_builder' ? 'elastic' : provider}
                          size={20}
                        />
                        <span>{policyProviderLabels[provider]}</span>
                      </EuiFlexGroup>
                    }
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiHorizontalRule />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.editor.conditions',
                { defaultMessage: 'Match tool activity' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.editor.conditionsHelp',
                {
                  defaultMessage:
                    'When both conditions are set, both must match the same call. Inputs are matched as literal text, not regular expressions.',
                }
              )}
            </p>
          </EuiText>
          <EuiFormRow
            id="aiPolicyToolsField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.tools',
              { defaultMessage: 'Tool name is one of' }
            )}
            helpText={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.toolsHelp',
              { defaultMessage: 'Exact names, separated by commas. Leave empty to match any tool.' }
            )}
            fullWidth
          >
            <EuiFieldText
              value={toolNames}
              onChange={(event) => {
                setToolNames(event.target.value);
                setPreview(undefined);
              }}
              placeholder="platform.core.execute_esql"
              fullWidth
              data-test-subj="aiPolicyToolNames"
            />
          </EuiFormRow>
          <EuiFormRow
            id="aiPolicyInputField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.contains',
              { defaultMessage: 'Tool input contains' }
            )}
            helpText={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.containsHelp',
              {
                defaultMessage:
                  'Case-insensitive text, such as a file path, destination, or index name. At least one condition is required.',
              }
            )}
            fullWidth
          >
            <EuiFieldText
              value={form.inputContains}
              onChange={(event) => update({ inputContains: event.target.value })}
              maxLength={500}
              fullWidth
              data-test-subj="aiPolicyInputContains"
            />
          </EuiFormRow>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                id="aiPolicyCategoryField"
                label={i18n.translate(
                  'xpack.securitySolution.entityIntelligence.policies.editor.category',
                  { defaultMessage: 'Finding category' }
                )}
                fullWidth
              >
                <EuiSelect
                  value={form.activityType}
                  options={Object.entries(policyActivityLabels).map(([value, text]) => ({
                    value,
                    text,
                  }))}
                  onChange={(event) =>
                    update({ activityType: event.target.value as AiPolicyInput['activityType'] })
                  }
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id="aiPolicySeverityField"
                label={i18n.translate(
                  'xpack.securitySolution.entityIntelligence.policies.editor.severity',
                  { defaultMessage: 'Finding severity' }
                )}
                fullWidth
              >
                <EuiSelect
                  value={form.severity}
                  options={Object.entries(policySeverityLabels).map(([value, text]) => ({
                    value,
                    text,
                  }))}
                  onChange={(event) =>
                    update({ severity: event.target.value as AiPolicyInput['severity'] })
                  }
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiSwitch
            label={enabledLabel}
            checked={form.enabled}
            onChange={(event) => update({ enabled: event.target.checked })}
          />
          <EuiSpacer />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.editor.effective',
                {
                  defaultMessage:
                    'Saved changes apply to activity observed after the new revision becomes effective. Findings preserve the revision that matched.',
                }
              )}
            </p>
          </EuiText>
        </EuiForm>
        <EuiHorizontalRule />
        <EuiAccordion
          id="aiPolicyPreview"
          buttonContent={i18n.translate(
            'xpack.securitySolution.entityIntelligence.policies.editor.preview',
            { defaultMessage: 'Try the matching conditions' }
          )}
          paddingSize="m"
        >
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityIntelligence.policies.editor.previewHelp',
                {
                  defaultMessage:
                    'A local preview only. This does not execute a tool, save the policy, or create a finding.',
                }
              )}
            </p>
          </EuiText>
          <EuiFormRow
            id="aiPolicyPreviewSourceField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.previewProvider',
              { defaultMessage: 'Example agent source' }
            )}
            fullWidth
          >
            <EuiSelect
              value={previewProvider}
              options={providerValues.map((value) => ({
                value,
                text: policyProviderLabels[value],
              }))}
              onChange={(event) => {
                setPreviewProvider(event.target.value as AiPolicyProvider);
                setPreview(undefined);
              }}
              fullWidth
            />
          </EuiFormRow>
          <EuiFormRow
            id="aiPolicyPreviewToolField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.previewTool',
              { defaultMessage: 'Example tool name' }
            )}
            fullWidth
          >
            <EuiFieldText
              value={previewTool}
              onChange={(event) => {
                setPreviewTool(event.target.value);
                setPreview(undefined);
              }}
              fullWidth
            />
          </EuiFormRow>
          <EuiFormRow
            id="aiPolicyPreviewInputField"
            label={i18n.translate(
              'xpack.securitySolution.entityIntelligence.policies.editor.previewInput',
              { defaultMessage: 'Example recorded input' }
            )}
            fullWidth
          >
            <EuiTextArea
              value={previewInput}
              onChange={(event) => {
                setPreviewInput(event.target.value);
                setPreview(undefined);
              }}
              rows={3}
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            onClick={() =>
              setPreview(previewPolicyMatch(input, previewProvider, previewTool, previewInput))
            }
            disabled={validatePolicy(input).length > 0}
          >
            {i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.check', {
              defaultMessage: 'Check match',
            })}
          </EuiButton>
          {preview !== undefined && (
            <>
              <EuiSpacer size="s" />
              <KbnInfoCallout
                announceOnMount
                size="s"
                title={
                  preview
                    ? i18n.translate(
                        'xpack.securitySolution.entityIntelligence.policies.editor.matches',
                        { defaultMessage: 'These conditions match the example call.' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityIntelligence.policies.editor.noMatch',
                        { defaultMessage: 'These conditions do not match the example call.' }
                      )
                }
              />
            </>
          )}
        </EuiAccordion>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} disabled={saving}>
              {i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="save"
              onClick={() => void submit()}
              isLoading={saving}
              data-test-subj="aiPolicySave"
            >
              {existing
                ? i18n.translate('xpack.securitySolution.entityIntelligence.policies.editor.save', {
                    defaultMessage: 'Save revision',
                  })
                : i18n.translate(
                    'xpack.securitySolution.entityIntelligence.policies.editor.createButton',
                    { defaultMessage: 'Create policy' }
                  )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
