/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { AssistantSpaceIdProvider, ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { noop } from 'lodash/fp';
import React, { useCallback, useState } from 'react';

import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import * as i18n from './translations';

const MODAL_WIDTH = 800;
const TEXTAREA_ROWS = 6;

const modalStyles = css`
  inline-size: ${MODAL_WIDTH}px;
`;

interface Props {
  connectorId: string | undefined;
  isGenerating: boolean;
  onClose: () => void;
  onGenerate: (description: string, selectedConnectorId: string) => void;
}

const GenerateWorkflowModalComponent: React.FC<Props> = ({
  connectorId,
  isGenerating,
  onClose,
  onGenerate,
}) => {
  const [description, setDescription] = useState('');
  const [localConnectorId, setLocalConnectorId] = useState<string | undefined>(connectorId);
  const modalTitleId = useGeneratedHtmlId();
  const spaceId = useSpaceId();

  const isDescriptionEmpty = description.trim().length === 0;

  const handleConnectorIdSelected = useCallback((selectedId: string) => {
    setLocalConnectorId(selectedId);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleGenerate = useCallback(() => {
    if (localConnectorId != null) {
      onGenerate(description, localConnectorId);
    }
  }, [description, localConnectorId, onGenerate]);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      css={modalStyles}
      data-test-subj="generateWorkflowModal"
      maxWidth={MODAL_WIDTH}
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="title" id={modalTitleId}>
          {i18n.GENERATE_WORKFLOW_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow data-test-subj="descriptionLabel" fullWidth label={i18n.DESCRIBE_YOUR_WORKFLOW}>
          <EuiTextArea
            data-test-subj="description"
            disabled={isGenerating}
            fullWidth
            onChange={handleDescriptionChange}
            placeholder={i18n.WORKFLOW_DESCRIPTION_PLACEHOLDER}
            rows={TEXTAREA_ROWS}
            value={description}
          />
        </EuiFormRow>

        {spaceId != null && (
          <AssistantSpaceIdProvider spaceId={spaceId}>
            <EuiFlexGroup
              alignItems="center"
              data-test-subj="connectorSelectorRow"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  {i18n.MODEL}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorSelectorInline
                  isDisabled={isGenerating}
                  onConnectorIdSelected={handleConnectorIdSelected}
                  onConnectorSelected={noop}
                  selectedConnectorId={localConnectorId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </AssistantSpaceIdProvider>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="cancel" onClick={onClose}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="generate"
              disabled={isDescriptionEmpty || localConnectorId == null || isGenerating}
              fill
              iconType="sparkles"
              isLoading={isGenerating}
              onClick={handleGenerate}
            >
              {i18n.GENERATE_WORKFLOW}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

GenerateWorkflowModalComponent.displayName = 'GenerateWorkflowModal';

export const GenerateWorkflowModal = React.memo(GenerateWorkflowModalComponent);
