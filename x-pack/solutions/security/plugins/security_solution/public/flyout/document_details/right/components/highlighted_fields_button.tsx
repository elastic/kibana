/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHighlightedFieldsPrivilege } from '../../shared/hooks/use_highlighted_fields_privilege';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useRuleDetails } from '../../../rule_details/hooks/use_rule_details';
import { HighlightedFieldsModal } from './highlighted_fields_modal';
import {
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_LOADING_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TOOLTIP_TEST_ID,
} from './test_ids';

interface EditHighlightedFieldsButtonProps {
  /**
   * Preselected custom highlighted fields
   */
  customHighlightedFields: string[];
  /**
   * The data formatted for field browser
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * The function to set the edit loading state
   */
  setIsEditLoading: (isEditLoading: boolean) => void;
}

/**
 * Component that displays the highlighted fields in the right panel under the Investigation section.
 */
export const EditHighlightedFieldsButton: FC<EditHighlightedFieldsButtonProps> = ({
  customHighlightedFields,
  dataFormattedForFieldBrowser,
  setIsEditLoading,
}) => {
  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { rule, isExistingRule, loading: isRuleLoading } = useRuleDetails({ ruleId });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const onClick = useCallback(() => setIsModalVisible(true), []);

  const { isDisabled, tooltipContent } = useHighlightedFieldsPrivilege({
    rule,
    isExistingRule,
  });

  if (isRuleLoading) {
    return (
      <EuiLoadingSpinner size="m" data-test-subj={HIGHLIGHTED_FIELDS_EDIT_BUTTON_LOADING_TEST_ID} />
    );
  }

  if (!rule) {
    return null;
  }

  return (
    <>
      <EuiToolTip
        content={tooltipContent}
        data-test-subj={HIGHLIGHTED_FIELDS_EDIT_BUTTON_TOOLTIP_TEST_ID}
      >
        <EuiButtonEmpty
          onClick={onClick}
          disabled={isDisabled}
          data-test-subj={HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsButton"
            defaultMessage="+ Add Field"
          />
        </EuiButtonEmpty>
      </EuiToolTip>
      {isModalVisible && (
        <HighlightedFieldsModal
          customHighlightedFields={customHighlightedFields}
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          rule={rule}
          setIsEditLoading={setIsEditLoading}
          setIsModalVisible={setIsModalVisible}
        />
      )}
    </>
  );
};
