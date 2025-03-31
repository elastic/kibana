/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback } from 'react';
import type { FC } from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useFetchIndex } from '../../../../common/containers/source';
import { usePrebuiltRuleCustomizationUpsellingMessage } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rule_customization_upselling_message';
import { HighlighedFieldsModal } from './highlighted_fields_modal';
import {
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID,
  HIGHLIGHTED_FIELDS_EDIT_BUTTON_TOOLTIP_TEST_ID,
} from './test_ids';

interface EditHighlighedFieldsButtonProps {
  /**
   * The default highlighted fields
   */
  customHighlightedFields: string[];
  /**
   * The data formatted for field browser
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * The rule
   */
  rule: RuleResponse;
  /**
   * The function to set the edit loading state
   */
  setIsEditLoading: (isEditLoading: boolean) => void;
}

/**
 * Component that displays the highlighted fields in the right panel under the Investigation section.
 */
export const EditHighlighedFieldsButton: FC<EditHighlighedFieldsButtonProps> = ({
  customHighlightedFields,
  dataFormattedForFieldBrowser,
  rule,
  setIsEditLoading,
}) => {
  const upsellingMessage = usePrebuiltRuleCustomizationUpsellingMessage(
    'prebuilt_rule_customization'
  );
  const canEditRule = !upsellingMessage || !rule.immutable;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const onClick = useCallback(() => setIsModalVisible(true), []);

  const indices = useMemo(
    () => (rule && 'index' in rule && rule.index && rule.index.length > 0 ? rule.index : []),
    [rule]
  );
  // const indexPatternId = rule?.data_view_id;
  const [_, { indexPatterns: dataView }] = useFetchIndex(indices, false);

  const tooltipContent = useMemo(() => {
    if (!canEditRule && upsellingMessage) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsButtonUpsellingTooltip"
          defaultMessage={upsellingMessage}
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsButtonTooltip"
        defaultMessage="Edit highlighted fields"
      />
    );
  }, [upsellingMessage, canEditRule]);

  return (
    <>
      <EuiToolTip
        content={tooltipContent}
        data-test-subj={HIGHLIGHTED_FIELDS_EDIT_BUTTON_TOOLTIP_TEST_ID}
      >
        <EuiButtonEmpty
          iconType={'gear'}
          onClick={onClick}
          disabled={!canEditRule}
          data-test-subj={HIGHLIGHTED_FIELDS_EDIT_BUTTON_TEST_ID}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.investigation.highlightedFields.editHighlightedFieldsButton"
            defaultMessage="Edit"
          />
        </EuiButtonEmpty>
      </EuiToolTip>
      {isModalVisible && (
        <HighlighedFieldsModal
          customHighlightedFields={customHighlightedFields}
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          fieldOptions={dataView.fields}
          rule={rule}
          setIsEditLoading={setIsEditLoading}
          setIsModalVisible={setIsModalVisible}
        />
      )}
    </>
  );
};
