/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';

const MODAL_TITLE = i18n.translate('xpack.securitySolution.detectionEngine.emulation.modal.title', {
  defaultMessage: 'Command Approval Required',
});

const MODAL_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.warningBody',
  {
    defaultMessage:
      'This command will be executed on a live endpoint. Please review carefully before approving.',
  }
);

const TECHNIQUE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.techniqueLabel',
  { defaultMessage: 'Technique:' }
);

const PHASE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.phaseLabel',
  { defaultMessage: 'Phase:' }
);

const TARGET_HOST_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.targetHostLabel',
  { defaultMessage: 'Target Host:' }
);

const AGENT_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.agentTypeLabel',
  { defaultMessage: 'Agent Type:' }
);

const TIMEOUT_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.timeoutLabel',
  { defaultMessage: 'Timeout:' }
);

const RATIONALE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.rationaleLabel',
  { defaultMessage: 'Rationale:' }
);

const MODIFIED_COMMAND_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.modifiedCommandLabel',
  { defaultMessage: 'Modified command to execute:' }
);

const COMMAND_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.commandLabel',
  { defaultMessage: 'Command to execute:' }
);

const REJECT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.rejectButton',
  { defaultMessage: 'Reject' }
);

const CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.calloutTitle',
  { defaultMessage: 'Real Execution Mode - Command Confirmation' }
);

const MODIFY_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.modifySwitchLabel',
  { defaultMessage: 'Modify command before executing' }
);

const COMMAND_FORM_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.commandFormLabel',
  { defaultMessage: 'Command' }
);

const ARGS_FORM_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.argsFormLabel',
  { defaultMessage: 'Arguments' }
);

const ARGS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.argsPlaceholder',
  { defaultMessage: 'Space-separated arguments' }
);

const APPROVE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.approveButton',
  { defaultMessage: 'Approve' }
);

const APPROVE_MODIFIED_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.emulation.modal.approveModifiedButton',
  { defaultMessage: 'Approve Modified Command' }
);

export interface CommandSuggestion {
  technique_id: string;
  phase_id: string;
  host_id: string;
  agent_type?: ResponseActionAgentType;
  command: string;
  args?: string[];
  timeout?: string;
  rationale: string;
}

export interface CommandApprovalResponse {
  decision: 'approve' | 'modify';
  modified_command?: string;
  modified_args?: string[];
}

export interface RunEmulationModalProps {
  suggestion: CommandSuggestion;
  requestId: string;
  onApprove: (requestId: string, response: CommandApprovalResponse) => void;
  onReject: (requestId: string) => void;
}

/**
 * Tokenize a user-provided argv string into an argv array while preserving
 * quoted segments. Splitting on a bare space (the previous implementation)
 * silently corrupts arguments like `--message="hello world"` or paths with
 * spaces (`/Library/Application Support/foo`) because the resulting argv
 * splits the value across multiple positions (I12).
 *
 * Rules:
 * - Whitespace separates tokens.
 * - Single and double quotes group runs of characters into one token.
 * - Backslash escapes the next character verbatim.
 * - Unterminated quotes still emit the partial token (we keep what the user
 *   typed and let the server validate downstream rather than throwing).
 */
function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaping) {
      current += ch;
      escaping = false;
    } else if (ch === '\\') {
      escaping = true;
    } else if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export const RunEmulationModal: React.FC<RunEmulationModalProps> = ({
  suggestion,
  requestId,
  onApprove,
  onReject,
}) => {
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [modifiedCommand, setModifiedCommand] = useState(suggestion.command);
  const [modifiedArgs, setModifiedArgs] = useState(
    suggestion.args ? suggestion.args.join(' ') : ''
  );
  // I11: track in-flight approve/reject calls so the buttons can disable
  // themselves and prevent the user from double-submitting (which would
  // result in two response-actions being dispatched).
  const [isSubmitting, setIsSubmitting] = useState(false);

  // I10: when the parent swaps in a new suggestion / requestId (e.g. the next
  // pending approval in the queue), reset the local modify-state. Without
  // this, the user's edits to the previous suggestion would silently bleed
  // into the new one. We key off both `requestId` and `suggestion.command`
  // because the requestId is the canonical "this is a different decision".
  useEffect(() => {
    setIsModifyMode(false);
    setModifiedCommand(suggestion.command);
    setModifiedArgs(suggestion.args ? suggestion.args.join(' ') : '');
    setIsSubmitting(false);
  }, [requestId, suggestion]);

  const modifiedArgv = useMemo(() => tokenizeArgs(modifiedArgs), [modifiedArgs]);

  const handleApprove = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    const response: CommandApprovalResponse = {
      decision: isModifyMode ? 'modify' : 'approve',
      ...(isModifyMode && {
        modified_command: modifiedCommand,
        modified_args: modifiedArgv.length > 0 ? modifiedArgv : undefined,
      }),
    };
    onApprove(requestId, response);
  }, [isModifyMode, isSubmitting, modifiedCommand, modifiedArgv, onApprove, requestId]);

  const handleReject = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    onReject(requestId);
  }, [isSubmitting, onReject, requestId]);

  const fullCommand = suggestion.args
    ? `${suggestion.command} ${suggestion.args.join(' ')}`
    : suggestion.command;

  // The display string mirrors the *tokenized* argv so the user sees the
  // same shell-quoted result that will actually get dispatched.
  const modifiedFullCommand = isModifyMode
    ? [modifiedCommand, ...modifiedArgv].join(' ').trim()
    : fullCommand;

  return (
    <EuiModal
      onClose={handleReject}
      css={css`
        min-width: 600px;
      `}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h2>{MODAL_TITLE}</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut title={CALLOUT_TITLE} color="warning" iconType="alert">
          <p>{MODAL_WARNING_BODY}</p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{TECHNIQUE_LABEL}</strong> {suggestion.technique_id}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{PHASE_LABEL}</strong> {suggestion.phase_id}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{TARGET_HOST_LABEL}</strong> {suggestion.host_id}
            </EuiText>
          </EuiFlexItem>
          {suggestion.agent_type && (
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{AGENT_TYPE_LABEL}</strong> {suggestion.agent_type}
              </EuiText>
            </EuiFlexItem>
          )}
          {suggestion.timeout && (
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{TIMEOUT_LABEL}</strong> {suggestion.timeout}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiText size="s">
          <strong>{RATIONALE_LABEL}</strong>
        </EuiText>
        <EuiText size="s" color="subdued">
          {suggestion.rationale}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiSwitch
          id="emulation-modify-switch"
          label={MODIFY_SWITCH_LABEL}
          checked={isModifyMode}
          onChange={(e) => setIsModifyMode(e.target.checked)}
        />

        <EuiSpacer size="m" />

        {isModifyMode ? (
          <>
            <EuiFormRow label={COMMAND_FORM_LABEL} fullWidth>
              <EuiFieldText
                value={modifiedCommand}
                onChange={(e) => setModifiedCommand(e.target.value)}
                fullWidth
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow label={ARGS_FORM_LABEL} fullWidth>
              <EuiFieldText
                value={modifiedArgs}
                onChange={(e) => setModifiedArgs(e.target.value)}
                placeholder={ARGS_PLACEHOLDER}
                fullWidth
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>{MODIFIED_COMMAND_LABEL}</strong>
            </EuiText>
            <EuiCodeBlock language="bash" fontSize="s" paddingSize="s">
              {modifiedFullCommand}
            </EuiCodeBlock>
          </>
        ) : (
          <>
            <EuiText size="xs">
              <strong>{COMMAND_LABEL}</strong>
            </EuiText>
            <EuiCodeBlock language="bash" fontSize="s" paddingSize="s">
              {fullCommand}
            </EuiCodeBlock>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleReject}
              color="danger"
              isDisabled={isSubmitting}
              data-test-subj="emulation-modal-reject-button"
            >
              {REJECT_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleApprove}
              fill
              color="primary"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              data-test-subj="emulation-modal-approve-button"
            >
              {isModifyMode ? APPROVE_MODIFIED_BUTTON_LABEL : APPROVE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
