/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlyoutHeader,
  EuiLink,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DocumentCreationLogic } from '..';
import { CANCEL_BUTTON_LABEL } from '../../../../shared/constants';

import { FLYOUT_ARIA_LABEL_ID } from '../constants';
import { Errors } from '../creation_response_components';

import './paste_json_text.scss';

export const ElasticsearchIndex: React.FC = () => (
  <>
    <FlyoutHeader />
    <FlyoutBody />
    <FlyoutFooter />
  </>
);

export const FlyoutHeader: React.FC = () => {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={FLYOUT_ARIA_LABEL_ID}>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.title',
            {
              defaultMessage: 'Connect an Elasticsearch index',
            }
          )}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};

export const FlyoutBody: React.FC = () => {
  return (
    <EuiFlyoutBody banner={<Errors />}>
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.description"
            defaultMessage="'You can now connect directly to an existing Elasticsearch index to make its data searchable and tunable through Enterprise Search Uls. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink target="_blank" href={'TODO'}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.link',
                    {
                      defaultMessage: 'Learn more about using an existing index',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer />
      {'{Form fields go here}'}
    </EuiFlyoutBody>
  );
};

export const FlyoutFooter: React.FC = () => {
  // TODO: replace these
  const { textInput, isUploading } = useValues(DocumentCreationLogic);
  // TODO: replace 'onSubmitJson'
  const { onSubmitJson, closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={closeDocumentCreation}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onSubmitJson} isLoading={isUploading} isDisabled={!textInput}>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.button',
              {
                defaultMessage: 'Connect to index',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
