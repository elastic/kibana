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
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
interface IndexloadingErrorProps {
  error: {
    title: string;
    message: string;
  };
  navigateToIndexListPage: () => void;
  reloadFunction: () => void;
}
export const IndexloadingError = ({
  error: { title, message },
  navigateToIndexListPage,
  reloadFunction,
}: IndexloadingErrorProps) => (
  <EuiPageTemplate.EmptyPrompt
    data-test-subj="pageLoadError"
    color="danger"
    iconType="warning"
    title={
      <h2>
        <FormattedMessage
          id="xpack.searchIndices.pageLoadError.errorTitle"
          defaultMessage="{error}"
          values={{
            error: title,
          }}
        />
      </h2>
    }
    body={
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.searchIndices.pageLoadError.description"
          defaultMessage="{message}"
          values={{
            message,
          }}
        />
      </EuiText>
    }
    actions={
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="danger"
            iconType="arrowLeft"
            onClick={() => navigateToIndexListPage()}
            data-test-subj="loadingErrorBackToIndicesButton"
          >
            <FormattedMessage
              id="xpack.searchIndices.pageLoadError.backToIndicesButtonLabel"
              defaultMessage="Back to indices"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconSide="right"
            onClick={reloadFunction}
            iconType="refresh"
            color="danger"
            data-test-subj="reloadButton"
          >
            <FormattedMessage
              id="xpack.searchIndices.pageLoadError.reloadButtonLabel"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  />
);
