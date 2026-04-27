/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../ai_privilege_translations';

export const AI_ASSISTANT_PRIVILEGE_CALLOUT_TEST_SUBJ = 'aiAssistantPrivilegeCallout';

const AiAssistantPrivilegeCalloutComponent: React.FC = () => {
  return (
    <>
      <EuiCallOut
        announceOnMount
        color="warning"
        data-test-subj={AI_ASSISTANT_PRIVILEGE_CALLOUT_TEST_SUBJ}
        iconType="iInCircle"
        title={i18n.NO_AI_ASSISTANT_PRIVILEGE_CALLOUT_TITLE}
      >
        <p>{i18n.NO_AI_ASSISTANT_PRIVILEGE_CALLOUT_BODY}</p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

AiAssistantPrivilegeCalloutComponent.displayName = 'AiAssistantPrivilegeCallout';

export const AiAssistantPrivilegeCallout = React.memo(AiAssistantPrivilegeCalloutComponent);
