/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiText } from '@elastic/eui';
import React from 'react';
import { AI_RULE_CREATION_INFO_TITLE, AI_RULE_CREATION_INFO_MESSAGE } from './translations';

export const AiRuleInfo: React.FC = () => {
  return (
    <EuiCallOut
      title={AI_RULE_CREATION_INFO_TITLE}
      color="primary"
      size="s"
      data-test-subj="ai-rule-creation-info-callout"
    >
      <EuiText size="s">{AI_RULE_CREATION_INFO_MESSAGE}</EuiText>
    </EuiCallOut>
  );
};
