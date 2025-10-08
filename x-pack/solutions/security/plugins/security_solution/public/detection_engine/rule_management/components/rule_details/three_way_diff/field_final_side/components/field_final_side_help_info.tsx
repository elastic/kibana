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
import * as i18n from './translations';

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
    <EuiButtonIcon iconType="question" onClick={togglePopover} aria-label="Open help popover" />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={togglePopover}>
      <EuiText css={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText"
          defaultMessage="The {finalUpdateSectionLabel} section lets you preview and edit the final value of a field. This value is fully applied when you update the rule."
          values={{
            finalUpdateSectionLabel: <strong>{i18n.FINAL_UPDATE}</strong>,
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
