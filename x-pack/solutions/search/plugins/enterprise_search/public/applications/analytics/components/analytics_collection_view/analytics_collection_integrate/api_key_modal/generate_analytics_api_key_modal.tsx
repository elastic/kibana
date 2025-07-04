/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
  EuiText,
  EuiCodeBlock,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { generateAnalyticsApiKeyLogic } from '../../../../api/generate_analytics_api_key/generate_analytics_api_key_logic';

import { GenerateApiKeyModalLogic } from './generate_analytics_api_key_modal.logic';

interface GenerateAnalyticsApiKeyModalProps {
  collectionName: string;
  onClose(): void;
}

export const GenerateAnalyticsApiKeyModal: React.FC<GenerateAnalyticsApiKeyModalProps> = ({
  collectionName,
  onClose,
}) => {
  const { keyName, apiKey, isLoading, isSuccess } = useValues(GenerateApiKeyModalLogic);
  const { setKeyName } = useActions(GenerateApiKeyModalLogic);
  const { makeRequest } = useActions(generateAnalyticsApiKeyLogic);
  const copyApiKeyRef = useRef<HTMLAnchorElement>(null);
  const modalTitleId = useGeneratedHtmlId();

  useEffect(() => {
    if (isSuccess) {
      copyApiKeyRef.current?.focus();
    }
  }, [isSuccess]);

  useEffect(() => {
    setKeyName(`${collectionName} API key`);
  }, [collectionName]);

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.title',
            {
              defaultMessage: 'Create analytics API Key',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          <EuiPanel hasShadow={false} color={!isSuccess ? 'primary' : 'success'}>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="flexEnd">
                  {!isSuccess ? (
                    <>
                      <EuiFlexItem>
                        <EuiFormRow
                          label={
                            <FormattedMessage
                              id="xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.nameYourAPIKeyLabel"
                              defaultMessage="Name your API key"
                            />
                          }
                          fullWidth
                        >
                          <EuiFieldText
                            data-test-subj="enterpriseSearchGenerateAnalyticsApiKeyModalFieldText"
                            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-editName"
                            fullWidth
                            placeholder="Type a name for your API key"
                            onChange={(event) => setKeyName(event.currentTarget.value)}
                            value={keyName}
                            isLoading={isLoading}
                          />
                        </EuiFormRow>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-generateApiKeyButton"
                          data-test-subj="generateApiKeyButton"
                          iconSide="left"
                          iconType="plusInCircle"
                          fill
                          onClick={() => {
                            makeRequest({
                              collectionName,
                              keyName: keyName.trim(),
                            });
                          }}
                          disabled={keyName.trim().length <= 0}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.generateButton',
                            {
                              defaultMessage: 'Generate key',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    </>
                  ) : (
                    <EuiFlexItem>
                      <EuiCallOut
                        title={
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.callOutMessage"
                            defaultMessage="Done! The {name} API key was generated."
                            values={{
                              name: <strong>{keyName}</strong>,
                            }}
                          />
                        }
                        color="success"
                        iconType="check"
                        role="alert"
                      />
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem>
                          <EuiCodeBlock
                            aria-label={keyName}
                            fontSize="m"
                            paddingSize="m"
                            color="dark"
                            isCopyable
                          >
                            {apiKey}
                          </EuiCodeBlock>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            buttonRef={copyApiKeyRef}
                            data-test-subj="enterpriseSearchGenerateAnalyticsApiKeyModalButton"
                            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-csvDownloadButton"
                            aria-label={i18n.translate(
                              'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.csvDownloadButton',
                              { defaultMessage: 'Download API key' }
                            )}
                            iconType="download"
                            href={encodeURI(`data:text/csv;charset=utf-8,${apiKey}`)}
                            download={`${keyName}.csv`}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="s" color="#006bb8">
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.apiKeyWarning',
                          {
                            defaultMessage:
                              "Elastic does not store API keys. Once generated, you'll only be able to view the key one time. Make sure you save it somewhere secure. If you lose access to it you'll need to generate a new API key from this screen.",
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      </EuiModalBody>
      <EuiModalFooter>
        {apiKey ? (
          <EuiButton
            data-test-subj="enterpriseSearchGenerateAnalyticsApiKeyModalDoneButton"
            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-done"
            fill
            onClick={onClose}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.done',
              {
                defaultMessage: 'Done',
              }
            )}
          </EuiButton>
        ) : (
          <EuiButtonEmpty
            data-test-subj="enterpriseSearchGenerateAnalyticsApiKeyModalCancelButton"
            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-cancel"
            onClick={onClose}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.cancel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
