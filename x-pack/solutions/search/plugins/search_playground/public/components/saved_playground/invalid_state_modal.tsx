/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SavedPlaygroundLoadErrors } from '../../types';

export interface SavedPlaygroundInvalidStateModalProps {
  errors: SavedPlaygroundLoadErrors;
  onClose: () => void;
}

enum InvalidPlaygroundType {
  MissingIndices,
  MissingModel,
}

export const SavedPlaygroundInvalidStateModal = ({
  errors,
  onClose,
}: SavedPlaygroundInvalidStateModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const errorsTypes = useMemo(() => {
    const eTypes = new Set<InvalidPlaygroundType>();
    if (errors.missingIndices.length > 0) {
      eTypes.add(InvalidPlaygroundType.MissingIndices);
    }
    if (errors.missingModel !== undefined) {
      eTypes.add(InvalidPlaygroundType.MissingModel);
    }
    return eTypes;
  }, [errors]);
  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="edit-playground-name-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {errorsTypes.has(InvalidPlaygroundType.MissingIndices) &&
          errorsTypes.has(InvalidPlaygroundType.MissingModel) ? (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.invalidPlayground.title"
              defaultMessage="Invalid playground values"
            />
          ) : errorsTypes.has(InvalidPlaygroundType.MissingModel) ? (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.invalidModelConnector.title"
              defaultMessage="AI Connector not found"
            />
          ) : (
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.invalidDataSources.title"
              defaultMessage="Invalid data sources"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {errorsTypes.has(InvalidPlaygroundType.MissingIndices) && (
            <>
              <p>
                <FormattedMessage
                  id="xpack.searchPlayground.savedPlayground.invalidDataSources.description"
                  defaultMessage="Some indices were not found. These indices will be removed from your data source selection for this playground."
                />
              </p>
              <ul>
                {errors.missingIndices.map((index) => (
                  <li key={index}>{index}</li>
                ))}
              </ul>
            </>
          )}
          {errorsTypes.has(InvalidPlaygroundType.MissingModel) && (
            <p>
              <FormattedMessage
                id="xpack.searchPlayground.savedPlayground.invalidModelConnector.description"
                defaultMessage="The selected LLM connector for this playground was not found. Please select a different LLM for use with this playground."
              />
            </p>
          )}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          data-test-subj="searchPlaygroundInvalidSavedStateModalCloseButton"
          onClick={onClose}
          fill
        >
          <FormattedMessage
            id="xpack.searchPlayground.savedPlayground.invalidPlaygroundModal.close"
            defaultMessage="OK"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
