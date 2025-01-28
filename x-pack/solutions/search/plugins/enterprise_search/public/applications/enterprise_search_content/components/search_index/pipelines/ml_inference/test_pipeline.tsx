/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiResizableContainer,
  EuiSpacer,
  EuiTitle,
  EuiText,
  useIsWithinMaxBreakpoint,
  EuiPanel,
} from '@elastic/eui';

import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';

import { TestPipelineLogic } from './test_pipeline_logic';

import './add_inference_pipeline_flyout.scss';

export const TestPipeline: React.FC = () => {
  const {
    addInferencePipelineModal: {
      configuration: { fieldMappings },
      indexName,
    },
    getDocumentsErr,
    isGetDocumentsLoading,
    showGetDocumentErrors,
    simulateBody,
    simulatePipelineResult,
    simulatePipelineErrors,
  } = useValues(TestPipelineLogic);
  const { simulatePipeline, setPipelineSimulateBody, makeGetDocumentRequest } =
    useActions(TestPipelineLogic);

  const isSmallerViewport = useIsWithinMaxBreakpoint('s');
  const inputRef = useRef<HTMLInputElement>();
  const sampleFieldValue = i18n.translate(
    'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.sampleValue',
    {
      defaultMessage: 'REPLACE ME',
    }
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.title',
                { defaultMessage: 'Test your pipeline results' }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiText color="subdued" size="s">
            <p>
              <strong>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.optionalCallout',
                  { defaultMessage: 'This is an optional step.' }
                )}
              </strong>
              &nbsp;
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.description',
                {
                  defaultMessage:
                    'Use this tool to run a simulation of your pipeline in order to confirm that it produces your anticipated results.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.addDocument',
                    { defaultMessage: 'Search for a document' }
                  )}
                  helpText={i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.addDocument.helptext',
                    {
                      defaultMessage:
                        'Use a document to test your new pipeline. Search using document IDs',
                    }
                  )}
                  isInvalid={showGetDocumentErrors}
                  error={getDocumentsErr}
                >
                  <EuiFieldText
                    fullWidth
                    prepend={i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.addDocument.documentId',
                      { defaultMessage: 'Document ID' }
                    )}
                    inputRef={(ref: HTMLInputElement) => {
                      inputRef.current = ref;
                    }}
                    isInvalid={showGetDocumentErrors}
                    isLoading={isGetDocumentsLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputRef.current?.value.trim().length !== 0) {
                        makeGetDocumentRequest({
                          documentId: inputRef.current?.value.trim() ?? '',
                          indexName,
                        });
                      }
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.or',
                      { defaultMessage: 'Or' }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <p>
                    <strong>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.useJsonFormat',
                        {
                          defaultMessage: 'Use this JSON format to add your own array of documents',
                        }
                      )}
                    </strong>
                  </p>
                </EuiText>
                <EuiCodeBlock fontSize="m" isCopyable language="json" paddingSize="m">
                  {JSON.stringify(
                    JSON.parse(
                      `[{"_index":"index", "_id":"id", "_source":{${
                        fieldMappings
                          ? fieldMappings
                              .map(
                                (fieldMapping) =>
                                  `"${fieldMapping.sourceField}": "${sampleFieldValue}"`
                              )
                              .join(', ')
                          : `"my_field": "${sampleFieldValue}"`
                      }}}]`
                    ),
                    null,
                    2
                  )}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText>
                  <h5>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.subtitle.documents',
                      { defaultMessage: 'Raw document' }
                    )}
                  </h5>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <h5>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.subtitle.result',
                      { defaultMessage: 'Result' }
                    )}
                  </h5>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiResizableContainer
              direction={isSmallerViewport ? 'vertical' : 'horizontal'}
              className="resizableContainer"
            >
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel grow hasBorder initialSize={50} paddingSize="xs">
                    <CodeEditor
                      languageId="json"
                      options={{
                        automaticLayout: true,
                        lineNumbers: 'off',
                        tabSize: 2,
                      }}
                      value={simulateBody}
                      onChange={(value) => {
                        setPipelineSimulateBody(value);
                      }}
                    />
                  </EuiResizablePanel>

                  <EuiResizableButton />

                  <EuiResizablePanel grow hasBorder initialSize={50} paddingSize="xs">
                    <EuiCodeBlock language="json" isCopyable className="reviewCodeBlock">
                      {simulatePipelineErrors.length > 0
                        ? JSON.stringify(simulatePipelineErrors, null, 2)
                        : simulatePipelineResult
                        ? JSON.stringify(simulatePipelineResult, null, 2)
                        : '{}'}
                    </EuiCodeBlock>
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexItem grow={false}>
            <div>
              <EuiButton onClick={simulatePipeline}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.runButton',
                  { defaultMessage: 'Simulate Pipeline' }
                )}
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
