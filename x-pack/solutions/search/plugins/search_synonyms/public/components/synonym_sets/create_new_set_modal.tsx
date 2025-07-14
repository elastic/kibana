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
import { formatSynonymsSetName } from '../../utils/synonyms_utils';
import { usePutSynonymsSet } from '../../hooks/use_put_synonyms_set';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

interface CreateSynonymsSetModalProps {
  onClose: () => void;
}
export const CreateSynonymsSetModal = ({ onClose }: CreateSynonymsSetModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'createSynonymsSetModalTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'createSynonymsSetModalForm' });
  const overwriteId = useGeneratedHtmlId({ prefix: 'createSynonymsSetModalOverwrite' });

  const [name, setName] = useState('');
  const [rawName, setRawName] = useState('');
  const [conflictError, setConflictError] = useState(false);
  const [forceWrite, setForceWrite] = useState(false);
  const { mutate: createSynonymsSet } = usePutSynonymsSet(
    () => {
      onClose();
    },
    () => {
      setConflictError(true);
    }
  );
  const usageTracker = useUsageTracker();
  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.searchSynonyms.createSynonymsSetModal.title"
            defaultMessage="Name your synonyms set"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm
          id={formId}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            usageTracker?.click(AnalyticsEvents.new_set_created);
            createSynonymsSet({ synonymsSetId: name, forceWrite });
          }}
        >
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.searchSynonyms.createSynonymsSetModal.nameLabel', {
              defaultMessage: 'Name',
            })}
            helpText={
              !!rawName && !conflictError
                ? i18n.translate('xpack.searchSynonyms.createSynonymsSetModal.nameHelpText', {
                    defaultMessage: 'Your synonyms set will be named: {name}',
                    values: { name },
                  })
                : undefined
            }
            isInvalid={conflictError}
            error={
              conflictError
                ? i18n.translate('xpack.searchSynonyms.createSynonymsSetModal.nameErrorText', {
                    defaultMessage: 'A synonym set with id {name} already exists.',
                    values: { name },
                  })
                : undefined
            }
          >
            <EuiFieldText
              data-test-subj="searchSynonymsCreateSynonymsSetModalFieldText"
              value={rawName}
              onChange={(e) => {
                setRawName(e.target.value);
                setName(formatSynonymsSetName(e.target.value));
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
                  data-test-subj="searchSynonymsCreateSynonymsSetModalForceWrite"
                  label={i18n.translate('xpack.searchSynonyms.createSynonymsSetModal.forceWrite', {
                    defaultMessage: 'Overwrite the existing synonym set.',
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
          data-test-subj="searchSynonymsCreateSynonymsSetModalCancelButton"
          onClick={onClose}
        >
          <FormattedMessage
            id="xpack.searchSynonyms.createSynonymsSetModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="searchSynonymsCreateSynonymsSetModalCreateButton"
          form={formId}
          fill
          disabled={!name || (conflictError && !forceWrite)}
          type="submit"
        >
          <FormattedMessage
            id="xpack.searchSynonyms.createSynonymsSetModal.createButton"
            defaultMessage="Create"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};