/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { isEqual, snakeCase } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { VersionsPicker, VersionsPickerOptionEnum } from './versions_picker/versions_picker';
import { FieldUpgradeSideHeader } from '../field_upgrade_side_header';
import { useFieldUpgradeContext } from '../rule_upgrade/field_upgrade_context';
import {
  getComparisonOptionsForDiffOutcome,
  getVersionsForComparison,
  pickFieldValueForVersion,
} from './utils';
import { getSubfieldChanges } from './get_subfield_changes';
import { SubfieldChanges } from './subfield_changes';
import { ComparisonSideHelpInfo } from './comparison_side_help_info';
import * as i18n from './translations';

export function FieldComparisonSide(): JSX.Element {
  const { fieldName, fieldDiff, finalDiffableRule, hasResolvedValueDifferentFromSuggested } =
    useFieldUpgradeContext();
  const resolvedValue = finalDiffableRule[fieldName];

  const options = getComparisonOptionsForDiffOutcome(
    fieldDiff.diff_outcome,
    fieldDiff.conflict,
    hasResolvedValueDifferentFromSuggested
  );
  const [selectedOption, setSelectedOption] = useState<VersionsPickerOptionEnum>(options[0]);

  const [oldVersionType, newVersionType] = getVersionsForComparison(
    selectedOption,
    fieldDiff.has_base_version
  );

  const oldFieldValue = pickFieldValueForVersion(oldVersionType, fieldDiff, resolvedValue);
  const newFieldValue = pickFieldValueForVersion(newVersionType, fieldDiff, resolvedValue);

  const subfieldChanges = getSubfieldChanges(fieldName, oldFieldValue, newFieldValue);

  /* Change selected option to "My changes" if user has modified resolved value */
  const prevResolvedValue = usePrevious(resolvedValue);
  useEffect(() => {
    if (
      selectedOption !== VersionsPickerOptionEnum.MyChanges &&
      prevResolvedValue !== undefined &&
      !isEqual(prevResolvedValue, resolvedValue)
    ) {
      setSelectedOption(VersionsPickerOptionEnum.MyChanges);
    }
  }, [selectedOption, prevResolvedValue, resolvedValue]);

  return (
    <section data-test-subj={`${snakeCase(fieldName)}-comparisonSide`}>
      <FieldUpgradeSideHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>
                {i18n.TITLE}
                <ComparisonSideHelpInfo options={options} />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <VersionsPicker
              options={options}
              selectedOption={selectedOption}
              onChange={setSelectedOption}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FieldUpgradeSideHeader>
      <KibanaSectionErrorBoundary sectionName={i18n.TITLE}>
        <SubfieldChanges fieldName={fieldName} subfieldChanges={subfieldChanges} />
      </KibanaSectionErrorBoundary>
    </section>
  );
}
