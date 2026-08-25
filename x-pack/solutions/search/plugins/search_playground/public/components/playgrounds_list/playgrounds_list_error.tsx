/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { getErrorMessage } from '../../../common/errors';

export const PlaygroundsListError = ({ error }: { error: unknown }) => {
  return (
    <KibanaPageTemplate.Section alignment="center">
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.playgroundsList.error.title"
              defaultMessage="Unable to load your playgrounds"
            />
          </h2>
        }
        body={<EuiCodeBlock css={{ textAlign: 'left' }}>{getErrorMessage(error)}</EuiCodeBlock>}
      />
    </KibanaPageTemplate.Section>
  );
};
