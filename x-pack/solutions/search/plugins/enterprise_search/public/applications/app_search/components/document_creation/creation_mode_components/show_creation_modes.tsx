/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocumentCreationLogic, DocumentCreationButtons } from '..';
import { CANCEL_BUTTON_LABEL } from '../../../../shared/constants';
import { FLYOUT_ARIA_LABEL_ID } from '../constants';

export const ShowCreationModes: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={FLYOUT_ARIA_LABEL_ID}>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.showCreationModes.title',
              { defaultMessage: 'Add new documents' }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DocumentCreationButtons isFlyout />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={closeDocumentCreation}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
