/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { CUSTOMIZATION_DISABLED_CALLOUT_DESCRIPTION } from './translations';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';

export function CustomizationDisabledCallout() {
  const upsellingMessage = usePrebuiltRuleCustomizationUpsellingMessage();

  // Upselling message is returned only when the license level is insufficient
  if (!upsellingMessage) {
    return null;
  }

  return (
    <EuiCallOut title={upsellingMessage} size="s" color="primary">
      <p>{CUSTOMIZATION_DISABLED_CALLOUT_DESCRIPTION}</p>
    </EuiCallOut>
  );
}
