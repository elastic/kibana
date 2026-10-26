/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { BulkErrorSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export interface ArtifactImportErrorsModalProps {
  errors: BulkErrorSchema[];
  onClose: () => void;
  'data-test-subj'?: string;
}

export const ArtifactImportErrorsModal: React.FC<ArtifactImportErrorsModalProps> = ({
  errors,
  onClose,
  'data-test-subj': dataTestSubj = 'artifactImportErrorsModal',
}) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  const modalTitleId = useGeneratedHtmlId();

  const errorsToDisplay: Array<{ itemId: string; message: string }> = useMemo(
    () =>
      errors.map((error) => ({
        itemId: error.item_id ?? 'undefined',
        message: error.error.message.replace('EndpointArtifactError: ', ''),
      })),
    [errors]
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      data-test-subj={getTestId()}
      maxWidth={true}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.securitySolution.artifactListPage.importErrorsModal.title', {
            defaultMessage: 'Import errors',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            {i18n.translate('xpack.securitySolution.artifactListPage.importErrorsModal.info', {
              defaultMessage:
                "Some items couldn't be imported. Review the errors below for details.",
            })}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup
          css={(euiTheme) => ({
            maxHeight: '50vh',
            overflowY: 'auto',
            border: `1px solid ${euiTheme.euiTheme.colors.borderBasePlain}`,
          })}
          direction="column"
        >
          <EuiFlexItem>
            <EuiText size="s">
              <ol type="1">
                {errorsToDisplay.map((error, index) => (
                  <li
                    css={(euiTheme) => ({
                      '&::marker': { fontWeight: 'bold' },
                      margin: euiTheme.euiTheme.size.m,
                    })}
                    key={index}
                  >
                    <b>
                      {i18n.translate(
                        'xpack.securitySolution.artifactListPage.importErrorsModal.item',
                        {
                          defaultMessage: 'item ({itemId}):',
                          values: { itemId: error.itemId },
                        }
                      )}
                    </b>{' '}
                    {error.message}
                  </li>
                ))}
              </ol>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton fill color="primary" onClick={onClose} data-test-subj={getTestId('closeButton')}>
          {i18n.translate(
            'xpack.securitySolution.artifactListPage.importErrorsModal.closeButtonTitle',
            { defaultMessage: 'Close' }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
