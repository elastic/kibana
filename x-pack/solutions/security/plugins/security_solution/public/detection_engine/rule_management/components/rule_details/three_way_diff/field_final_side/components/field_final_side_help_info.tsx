/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/translations';

/**
 * Theme doesn't expose width variables. Using provided size variables will require
 * multiplying it by another magic constant.
 *
 * 320px width looks
 * like a [commonly used width in EUI](https://github.com/search?q=repo%3Aelastic%2Feui%20320&type=code).
 */
const POPOVER_WIDTH = 320;

export function FieldFinalSideHelpInfo(): JSX.Element {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const button = (
    <EuiButtonIcon
      iconType="questionInCircle"
      onClick={togglePopover}
      aria-label="Open help popover"
    />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={togglePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText"
          defaultMessage="The Final Update section lets you preview and edit the final value of a field. This is the value the rule will have after you click {updateButtonLabel}."
          values={{
            updateButtonLabel: <strong>{i18n.UPDATE_BUTTON_LABEL}</strong>,
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
