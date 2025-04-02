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
import { getDefineStepsData } from '../../../../detection_engine/common/helpers';
import { useRuleIndexPattern } from '../../../../detection_engine/rule_creation_ui/pages/form';
import { useDefaultIndexPattern } from '../../../../detection_engine/rule_management/hooks/use_default_index_pattern';
import { useHighlightedFieldsPrivilege } from '../../shared/hooks/use_highlighted_fields_privilege';
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
   * Whether the rule exists
   */
  isExistingRule: boolean;
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
  isExistingRule,
  setIsEditLoading,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const onClick = useCallback(() => setIsModalVisible(true), []);

  const defaultIndexPattern = useDefaultIndexPattern();
  const { dataSourceType, index, dataViewId } = useMemo(() => getDefineStepsData(rule), [rule]);
  const { indexPattern: dataView } = useRuleIndexPattern({
    dataSourceType,
    index: index.length > 0 ? index : defaultIndexPattern, // fallback to default index pattern if rule has no index patterns
    dataViewId,
  });

  const { isDisabled, tooltipContent } = useHighlightedFieldsPrivilege({
    rule,
    isExistingRule,
  });

  return (
    <>
      <EuiToolTip
        content={tooltipContent}
        data-test-subj={HIGHLIGHTED_FIELDS_EDIT_BUTTON_TOOLTIP_TEST_ID}
      >
        <EuiButtonEmpty
          iconType={'gear'}
          onClick={onClick}
          disabled={isDisabled}
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
