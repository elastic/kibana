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
import type { VersionsPickerOptionEnum } from './versions_picker/versions_picker';
import { getOptionDetails } from './utils';

/**
 * Theme doesn't expose width variables. Using provided size variables will require
 * multiplying it by another magic constant.
 *
 * 320px width looks
 * like a [commonly used width in EUI](https://github.com/search?q=repo%3Aelastic%2Feui%20320&type=code).
 */
const POPOVER_WIDTH = 320;

interface ComparisonSideHelpInfoProps {
  options: VersionsPickerOptionEnum[];
}

export function ComparisonSideHelpInfo({ options }: ComparisonSideHelpInfoProps): JSX.Element {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const optionsWithDescriptions = options.map((option) => getOptionDetails(option));

  const button = (
    <EuiButtonIcon
      iconType="question"
      onClick={togglePopover}
      aria-label={i18n.VERSION_COMPARISON_HELP_ARIA_LABEL}
    />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={togglePopover}>
      <EuiText css={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.rules.upgradeRules.comparisonSide.upgradeHelpText"
          defaultMessage="The {title} lets you compare the values of a field across different versions of a rule:"
          values={{
            title: <strong>{i18n.TITLE}</strong>,
          }}
        />
        <ul>
          {optionsWithDescriptions.map(({ title: displayName, description: explanation }) => (
            <li key={displayName}>
              <strong>{displayName}</strong>
              {':'} {explanation}
            </li>
          ))}
        </ul>
        <p>{i18n.DIFF_FORMAT_AND_COLORS_EXPLANATION}</p>
      </EuiText>
    </EuiPopover>
  );
}
