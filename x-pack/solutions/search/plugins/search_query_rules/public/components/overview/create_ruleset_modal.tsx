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
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatRulesetName } from '../../utils/query_rules_utils';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchQueryRulesetExist } from '../../hooks/use_fetch_ruleset_exists';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
interface CreateRulesetModalProps {
  onClose: () => void;
}
export const CreateRulesetModal = ({ onClose }: CreateRulesetModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'createRulesetModalTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'createRulesetModalForm' });

  const [name, setName] = useState('');
  const [rawName, setRawName] = useState('');
  const [conflictError, setConflictError] = useState(false);
  const [checkName, setCheckName] = useState('');
  const { data: rulesetExist } = useFetchQueryRulesetExist(
    checkName,
    () => {
      application.navigateToUrl(
        http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${name}/create`)
      );
    },
    () => {
      setConflictError(true);
    }
  );

  const {
    services: { http, application },
  } = useKibana();

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle
          id={modalTitleId}
          data-test-subj="searchRulesetCreateRulesetModalHeader"
        >
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
            setCheckName(name);
          }}
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.queryRules.createRulesetModal.nameLabel', {
              defaultMessage: 'Ruleset Name',
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
                setCheckName('');
              }}
            />
          </EuiFormRow>
          {conflictError && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.queryRules.createRulesetModal.editInsteadText"
                  defaultMessage="Choose a different name or edit the existing ruleset."
                />
              </EuiText>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.queryRules.createRulesetModal.forceWriteText"
                  defaultMessage="Edit ruleset: "
                />
                <EuiLink
                  data-test-subj="searchRulesetCreateRulesetModalEditLink"
                  onClick={() => {
                    application.navigateToUrl(
                      http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${name}`)
                    );
                  }}
                >
                  {name}
                </EuiLink>
              </EuiText>
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
          disabled={!name || (!!checkName && rulesetExist)}
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
