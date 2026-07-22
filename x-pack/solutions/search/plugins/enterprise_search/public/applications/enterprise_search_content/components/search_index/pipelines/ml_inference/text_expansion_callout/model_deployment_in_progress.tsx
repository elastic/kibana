/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { TextExpansionCallOutState } from './text_expansion_callout';

export const ModelDeploymentInProgress = ({
  dismiss,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiCallOut
    color="success"
    heading="h3"
    title={i18n.translate(
      'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingTitle',
      { defaultMessage: 'Your ELSER model is deploying.' }
    )}
    text={i18n.translate(
      'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingBody',
      {
        defaultMessage:
          'You can continue creating your pipeline with other uploaded models in the meantime.',
      }
    )}
    onDismiss={isDismissable ? dismiss : undefined}
    dismissButtonProps={{ 'data-test-subj': 'enterpriseSearchTextExpansionDismissButtonButton' }}
  />
);
