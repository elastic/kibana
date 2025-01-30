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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { formatSynonymsSetName } from '../../utils/synonyms_utils';
import { usePutSynonymsSet } from '../../hooks/use_put_synonyms_set';

interface CreateSynonymsSetModalProps {
  onClose: () => void;
}
export const CreateSynonymsSetModal = ({ onClose }: CreateSynonymsSetModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'createSynonymsSetModalTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'createSynonymsSetModalForm' });

  const [name, setName] = useState('');
  const [rawName, setRawName] = useState('');
  const { mutate: createSynonymsSet } = usePutSynonymsSet(() => {
    onClose();
  });
  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
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
            createSynonymsSet({ synonymsSetId: name });
          }}
        >
          <EuiFormRow
            label={i18n.translate('xpack.searchSynonyms.createSynonymsSetModal.nameLabel', {
              defaultMessage: 'Name',
            })}
            helpText={
              !!rawName
                ? i18n.translate('xpack.searchSynonyms.createSynonymsSetModal.nameHelpText', {
                    defaultMessage: 'Your synonyms set will be named: {name}',
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
              }}
            />
          </EuiFormRow>
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
          disabled={!name}
          onClick={() => {
            createSynonymsSet({ synonymsSetId: name });
          }}
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
