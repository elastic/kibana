/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import { PanelBody } from '../styles';
import { i18nNamespaceKey } from '../constants';
import { EMPTY_BODY_TEST_ID } from '../test_ids';

const noItemsFound = i18n.translate(`${i18nNamespaceKey}.noItemsFound`, {
  defaultMessage: 'No items found in group',
});

const bodyContent = i18n.translate(`${i18nNamespaceKey}.bodyContent`, {
  defaultMessage: 'Please, try again reloading the page',
});

export const EmptyBody = () => (
  <PanelBody data-test-subj={EMPTY_BODY_TEST_ID}>
    <EuiEmptyPrompt
      color="subdued"
      title={<h2>{noItemsFound}</h2>}
      layout="vertical"
      body={<p>{bodyContent}</p>}
    />
  </PanelBody>
);
