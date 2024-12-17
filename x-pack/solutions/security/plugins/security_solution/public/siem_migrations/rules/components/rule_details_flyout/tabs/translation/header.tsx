/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiTitle } from '@elastic/eui';
import * as i18n from './translations';

export const TranslationTabHeader: React.FC = React.memo(() => {
  return (
    <EuiFlexGroup direction="row" alignItems="center">
      <EuiTitle data-test-subj="ruleTranslationLabel" size="xs">
        <h5>{i18n.TAB_HEADER_TITLE}</h5>
      </EuiTitle>
    </EuiFlexGroup>
  );
});
TranslationTabHeader.displayName = 'TranslationTabHeader';
