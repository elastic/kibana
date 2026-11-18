/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type {
  OnboardingPlan,
  PolicyPlan,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { getPackActionText, getRefusalText } from './translations';
import { SCANNER_SETTINGS_TEST_SUBJECTS, getConfirmPolicyTestSubject } from './test_subjects';

interface ConfirmEnableModalProps {
  plan: OnboardingPlan;
  isApplying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const getPolicyTitle = ({ name, id }: PolicyPlan) => name ?? id;

const ChangePreview = ({ policy }: { policy: PolicyPlan }) => (
  <>
    {policy.conflicts.length > 0 && (
      <>
        <KbnWarningCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('xpack.csp.nativeVulnScanner.confirm.conflictsTitle', {
            defaultMessage: 'These existing settings will be replaced',
          })}
          text={
            <ul>
              {policy.conflicts.map(({ key, from, to }) => (
                <li key={key}>
                  {i18n.translate('xpack.csp.nativeVulnScanner.confirm.conflict', {
                    defaultMessage: '{key}: {from} becomes {to}',
                    values: { key, from, to },
                  })}
                </li>
              ))}
            </ul>
          }
        />
        <EuiSpacer size="s" />
      </>
    )}
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.csp.nativeVulnScanner.confirm.before', {
              defaultMessage: 'Before',
            })}
          </strong>
        </EuiText>
        <EuiCodeBlock language="yaml" paddingSize="s" isCopyable={false}>
          {policy.before ?? ''}
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>
            {i18n.translate('xpack.csp.nativeVulnScanner.confirm.after', {
              defaultMessage: 'After',
            })}
          </strong>
        </EuiText>
        <EuiCodeBlock language="yaml" paddingSize="s" isCopyable={false}>
          {policy.after ?? ''}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

const PolicyEntry = ({ policy }: { policy: PolicyPlan }) => {
  const title = getPolicyTitle(policy);
  const testSubj = getConfirmPolicyTestSubject(policy.id);

  return (
    <div data-test-subj={testSubj}>
      <EuiText size="s">
        <h4>{title}</h4>
      </EuiText>
      <EuiSpacer size="xs" />
      {policy.outcome === 'change' && <ChangePreview policy={policy} />}
      {policy.outcome === 'no_change' && (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.csp.nativeVulnScanner.confirm.noChange', {
            defaultMessage: 'The runtime is already set. Nothing to change.',
          })}
        </EuiText>
      )}
      {(policy.outcome === 'refused' || policy.outcome === 'not_found') && (
        <KbnDangerCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('xpack.csp.nativeVulnScanner.confirm.refusedTitle', {
            defaultMessage: 'This policy will be skipped',
          })}
          text={getRefusalText(policy.reason, policy.key)}
        />
      )}
      <EuiSpacer size="m" />
    </div>
  );
};

const noop = () => {};

export const ConfirmEnableModal = ({
  plan,
  isApplying,
  onConfirm,
  onCancel,
}: ConfirmEnableModalProps) => {
  const titleId = useGeneratedHtmlId();
  const hasApplicable = plan.policies.some(
    ({ outcome }) => outcome === 'change' || outcome === 'no_change'
  );

  return (
    <EuiModal
      onClose={isApplying ? noop : onCancel}
      aria-labelledby={titleId}
      maxWidth={900}
      data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_MODAL}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.csp.nativeVulnScanner.confirm.title', {
            defaultMessage: 'Enable vulnerability scanning',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_PACK_ACTION}>
          <p>{getPackActionText(plan.pack.action)}</p>
        </EuiText>
        <EuiSpacer size="m" />
        {plan.policies.map((policy) => (
          <PolicyEntry key={policy.id} policy={policy} />
        ))}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          isDisabled={isApplying}
          data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.CANCEL_BUTTON}
        >
          {i18n.translate('xpack.csp.nativeVulnScanner.confirm.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onConfirm}
          isLoading={isApplying}
          isDisabled={!hasApplicable}
          data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.CONFIRM_BUTTON}
        >
          {i18n.translate('xpack.csp.nativeVulnScanner.confirm.confirm', {
            defaultMessage: 'Enable scanning',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
