/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { formatRulesetName } from '../../utils/query_rules_utils';
import { usePutRuleset } from '../../hooks/use_put_query_rules_ruleset';
interface CreateRulesetModalProps {
  onClose: () => void;
}
export const CreateRulesetModal = ({ onClose }: CreateRulesetModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'createRulesetModalTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'createRulesetModalForm' });
  const overwriteId = useGeneratedHtmlId({ prefix: 'createRulesetModalOverwrite' });

  const [name, setName] = useState('');
  const [rawName, setRawName] = useState('');
  const [conflictError, setConflictError] = useState(false);
  const [forceWrite, setForceWrite] = useState(false);
  const { mutate: createRuleset } = usePutRuleset(
    () => {
      onClose();
    },
    () => {
      setConflictError(true);
    }
  );
  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          <FormattedMessage
            id="xpack.queryRules.createRulesetModal.title"
            defaultMessage="Create ruleset"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm
          id={formId}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            createRuleset({ rulesetId: name, forceWrite });
          }}
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.queryRules.createRulesetModal.nameLabel', {
              defaultMessage: 'Ruleset ID',
            })}
            helpText={
              !!rawName && !conflictError
                ? i18n.translate('xpack.queryRules.createRulesetModal.nameHelpText', {
                    defaultMessage: 'Your ruleset set will be named: {name}',
                    values: { name },
                  })
                : undefined
            }
            isInvalid={conflictError}
            error={
              conflictError
                ? i18n.translate('xpack.queryRules.createRulesetModal.nameErrorText', {
                    defaultMessage: 'A ruleset with id {name} already exists.',
                    values: { name },
                  })
                : undefined
            }
          >
            <EuiFieldText
              data-test-subj="searchRulesetCreateRulesetModalFieldText"
              value={rawName}
              onChange={(e) => {
                setRawName(e.target.value);
                setName(formatRulesetName(e.target.value));
                setConflictError(false);
                setForceWrite(false);
              }}
            />
          </EuiFormRow>
          {conflictError && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow fullWidth>
                <EuiCheckbox
                  id={overwriteId}
                  data-test-subj="searchRulesetCreateRulesetModalForceWrite"
                  label={i18n.translate('xpack.queryRules.createRulesetModal.forceWrite', {
                    defaultMessage: 'Overwrite the existing ruleset.',
                  })}
                  checked={forceWrite}
                  onChange={() => setForceWrite(!forceWrite)}
                />
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="searchRulesetCreateRulesetModalCancelButton"
          onClick={onClose}
        >
          <FormattedMessage
            id="xpack.queryRules.createRulesetModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="searchRulesetCreateRulesetModalCreateButton"
          form={formId}
          fill
          disabled={!name || (conflictError && !forceWrite)}
          type="submit"
        >
          <FormattedMessage
            id="xpack.queryRules.createRulesetModal.createButton"
            defaultMessage="Create ruleset"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
