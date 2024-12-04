/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiPortal, EuiFlyout } from '@elastic/eui';

import { FLYOUT_ARIA_LABEL_ID } from './constants';
import {
  ShowCreationModes,
  ApiCodeExample,
  JsonFlyout,
  ElasticsearchIndex,
} from './creation_mode_components';
import { Summary } from './creation_response_components';
import { DocumentCreationStep } from './types';

import { DocumentCreationLogic } from '.';

export const DocumentCreationFlyout: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);
  const { isDocumentCreationOpen } = useValues(DocumentCreationLogic);

  return isDocumentCreationOpen ? (
    <EuiPortal>
      <EuiFlyout ownFocus aria-labelledby={FLYOUT_ARIA_LABEL_ID} onClose={closeDocumentCreation}>
        <FlyoutContent />
      </EuiFlyout>
    </EuiPortal>
  ) : null;
};

export const FlyoutContent: React.FC = () => {
  const { creationStep, creationMode } = useValues(DocumentCreationLogic);

  switch (creationStep) {
    case DocumentCreationStep.ShowCreationModes:
      return <ShowCreationModes />;
    case DocumentCreationStep.AddDocuments:
      switch (creationMode) {
        case 'api':
          return <ApiCodeExample />;
        case 'json':
          return <JsonFlyout />;
        case 'elasticsearchIndex':
          return <ElasticsearchIndex />;
      }
    case DocumentCreationStep.ShowSummary:
      return <Summary />;
  }
};
