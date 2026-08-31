/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export type DisableDefaultRuleKind = 'status' | 'tls' | 'both';

export const getDisableDefaultRuleKind = (
  disableStatus: boolean,
  disableTls: boolean
): DisableDefaultRuleKind | null => {
  if (disableStatus && disableTls) {
    return 'both';
  }
  if (disableStatus) {
    return 'status';
  }
  if (disableTls) {
    return 'tls';
  }
  return null;
};

export const DisableDefaultRuleModal = ({
  ruleKind,
  onCancel,
  onConfirm,
}: {
  ruleKind: DisableDefaultRuleKind;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      data-test-subj="syntheticsDisableDefaultRuleConfirmModal"
      title={getTitle(ruleKind)}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={CONFIRM_LABEL}
      buttonColor="danger"
      defaultFocusedButton="cancel"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.synthetics.settings.disableDefaultRules.deleteDescription"
            defaultMessage="{ruleKind, select, both {This deletes the default status and TLS rules.} status {This deletes the default status rule.} tls {This deletes the default TLS rule.} other {This deletes the default rules.}} Active alerts from {ruleKind, select, both {those rules} other {that rule}} become untracked."
            values={{ ruleKind }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.synthetics.settings.disableDefaultRules.customRulesDescription"
            defaultMessage="Custom synthetics rules are not affected. Re-enabling creates {ruleKind, select, both {new default rules} other {a new default rule}}."
            values={{ ruleKind }}
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};

const getTitle = (ruleKind: DisableDefaultRuleKind): string =>
  i18n.translate('xpack.synthetics.settings.disableDefaultRulesTitle', {
    defaultMessage:
      '{ruleKind, select, both {Disable default status and TLS rules?} status {Disable default status rule?} tls {Disable default TLS rule?} other {Disable default rules?}}',
    values: { ruleKind },
  });

const CANCEL_LABEL = i18n.translate(
  'xpack.synthetics.settings.disableDefaultRulesCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

const CONFIRM_LABEL = i18n.translate(
  'xpack.synthetics.settings.disableDefaultRulesConfirmButtonLabel',
  {
    defaultMessage: 'Apply',
  }
);
