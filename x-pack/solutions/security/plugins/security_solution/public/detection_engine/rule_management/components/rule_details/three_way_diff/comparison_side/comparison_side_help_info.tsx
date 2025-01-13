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
import { TITLE } from './translations';
import type { VersionsPickerOptionEnum } from './versions_picker/versions_picker';
import { useFieldUpgradeContext } from '../rule_upgrade/field_upgrade_context';
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

  const { hasResolvedValueDifferentFromSuggested } = useFieldUpgradeContext();
  const optionsWithDescriptions = options.map((option) =>
    getOptionDetails(option, hasResolvedValueDifferentFromSuggested)
  );

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
          id="xpack.securitySolution.detectionEngine.rules.upgradeRules.comparisonSide.upgradeHelpText"
          defaultMessage="The {title} lets you compare the values of a field across different versions of a rule: {versions} Differences are shown as JSON, with red lines showing what was removed, green lines showing additions, and bold text highlighting changes. Use {title} to review and understand changes across versions."
          values={{
            title: <strong>{TITLE}</strong>,
            versions: (
              <>
                <br />
                <ul>
                  {optionsWithDescriptions.map(
                    ({ title: displayName, description: explanation }) => (
                      <li key={displayName}>
                        <strong>{displayName}</strong> {'-'} {explanation}
                      </li>
                    )
                  )}
                </ul>
              </>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
