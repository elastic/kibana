/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { PanelBody } from '../styles';
import { i18nNamespaceKey } from '../constants';
import { EMPTY_BODY_TEST_ID, REFRESH_BUTTON_TEST_ID } from '../test_ids';

const noItemsFound = i18n.translate(`${i18nNamespaceKey}.noItemsFound`, {
  defaultMessage: 'No items found in group',
});

const refresh = i18n.translate(`${i18nNamespaceKey}.refresh`, {
  defaultMessage: 'Refresh view',
});

const refreshContent = i18n.translate(`${i18nNamespaceKey}.refreshContent`, {
  defaultMessage: 'Please, try again clicking on the "Refresh view" button',
});

export interface EmptyBodyProps {
  onRefresh: () => void;
}

export const EmptyBody: FC<EmptyBodyProps> = ({ onRefresh }) => (
  <PanelBody data-test-subj={EMPTY_BODY_TEST_ID}>
    <EuiEmptyPrompt
      color="subdued"
      title={<h2>{noItemsFound}</h2>}
      layout="vertical"
      body={<p>{refreshContent}</p>}
      actions={[
        <EuiButtonEmpty
          data-test-subj={REFRESH_BUTTON_TEST_ID}
          flush="both"
          onClick={onRefresh}
          aria-label={refresh}
        >
          {refresh}
        </EuiButtonEmpty>,
      ]}
    />
  </PanelBody>
);
