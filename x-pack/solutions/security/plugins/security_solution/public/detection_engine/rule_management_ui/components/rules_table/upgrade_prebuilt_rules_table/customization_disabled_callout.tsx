/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';
import * as i18n from './translations';

export function CustomizationDisabledCallout() {
  const title = usePrebuiltRuleCustomizationUpsellingMessage('prebuilt_rule_customization');
  const description = usePrebuiltRuleCustomizationUpsellingMessage(
    'prebuilt_rule_customization_description'
  );

  // Upselling message is returned only when the license level is insufficient
  if (!title) {
    return null;
  }

  return (
    <EuiCallOut title={title} size="s" color="primary">
      <p>{i18n.MODIFIED_RULE_UPGRADE_LICENSE_INSUFFICIENT_CALLOUT_DESCRIPTION}</p>
      <p>{description}</p>
    </EuiCallOut>
  );
}
