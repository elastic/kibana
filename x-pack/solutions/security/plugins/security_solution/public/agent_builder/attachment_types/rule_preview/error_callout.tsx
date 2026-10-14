/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const RulePreviewAttachmentErrorCallout = () => (
  <EuiCallOut
    announceOnMount={false}
    color="danger"
    iconType="warning"
    size="s"
    title={i18n.translate('xpack.securitySolution.agentBuilder.rulePreviewAttachment.errorTitle', {
      defaultMessage: 'Unable to load rule preview',
    })}
  />
);
