/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';

import * as i18n from './translations';

const EmptyPageComponent: React.FC = () => (
  <EuiEmptyPrompt
    body={
      <EuiText color="subdued" size="s">
        <p>{i18n.EMPTY_PAGE_DESCRIPTION}</p>
      </EuiText>
    }
    data-test-subj="monitoringEmptyPage"
    iconType="visLine"
    title={<h3>{i18n.EMPTY_PAGE_TITLE}</h3>}
    titleSize="s"
  />
);

EmptyPageComponent.displayName = 'EmptyPage';

export const EmptyPage = React.memo(EmptyPageComponent);
