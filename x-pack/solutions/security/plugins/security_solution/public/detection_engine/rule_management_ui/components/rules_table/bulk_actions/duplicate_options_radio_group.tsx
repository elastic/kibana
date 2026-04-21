/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiRadioGroup, EuiText, EuiIconTip } from '@elastic/eui';
import { DuplicateOptions } from '../../../../../../common/detection_engine/rule_management/constants';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { bulkDuplicateRuleActions as i18n } from './translations';

interface DuplicateOptionsRadioGroupProps {
  rulesCount: number;
  selectedOption: DuplicateOptions;
  disabled?: boolean;
  onChange: (option: DuplicateOptions) => void;
}

export const DuplicateOptionsRadioGroup = ({
  rulesCount,
  selectedOption,
  disabled = false,
  onChange,
}: DuplicateOptionsRadioGroupProps) => {
  const handleRadioChange = useCallback(
    (optionId: string) => {
      onChange(optionId as DuplicateOptions);
    },
    [onChange]
  );

  return (
    <EuiRadioGroup
      name="duplicateExceptionOption"
      options={[
        {
          id: DuplicateOptions.withExceptions,
          disabled,
          label: (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.DUPLICATE_EXCEPTIONS_INCLUDE_EXPIRED_EXCEPTIONS_LABEL(rulesCount)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip content={i18n.DUPLICATE_TOOLTIP} position="bottom" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          'data-test-subj': DuplicateOptions.withExceptions,
        },
        {
          id: DuplicateOptions.withExceptionsExcludeExpiredExceptions,
          disabled,
          label: (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{i18n.DUPLICATE_EXCEPTIONS_TEXT(rulesCount)}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip content={i18n.DUPLICATE_TOOLTIP} position="bottom" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          'data-test-subj': DuplicateOptions.withExceptionsExcludeExpiredExceptions,
        },
        {
          id: DuplicateOptions.withoutExceptions,
          label: i18n.DUPLICATE_WITHOUT_EXCEPTIONS_TEXT(rulesCount),
          'data-test-subj': DuplicateOptions.withoutExceptions,
        },
      ]}
      idSelected={selectedOption}
      onChange={handleRadioChange}
    />
  );
};

export const useDuplicateOptionsRadioGroup = ({ rulesCount }: { rulesCount: number }) => {
  const {
    exceptions: { edit: canEditExceptions },
  } = useUserPrivileges().rulesPrivileges;

  const [selectedOption, setSelectedOption] = useState(
    canEditExceptions ? DuplicateOptions.withExceptions : DuplicateOptions.withoutExceptions
  );

  const radioGroup = (
    <DuplicateOptionsRadioGroup
      rulesCount={rulesCount}
      selectedOption={selectedOption}
      disabled={!canEditExceptions}
      onChange={setSelectedOption}
    />
  );

  return { selectedOption, radioGroup };
};
