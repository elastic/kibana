/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSwitch,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { TableTabState } from '../tabs/table_tab';
import {
  TABLE_TAB_SETTING_BUTTON_TEST_ID,
  TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID,
  TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID,
  TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID,
} from './test_ids';

const TABLE_TAB_SETTING_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.right.tableTabSettingButton.label',
  {
    defaultMessage: 'Table settings',
  }
);

const HIGHLIGHTED_FIELDS_ONLY_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.right.tableTabSettingButton.highlightedFieldsOnlyLabel',
  {
    defaultMessage: 'Show highlighted fields only',
  }
);

const HIDE_EMPTY_FIELDS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.right.tableTabSettingButton.hideEmptyFieldsLabel',
  {
    defaultMessage: 'Hide empty fields',
  }
);

const HIDE_ALERT_FIELDS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.right.tableTabSettingButton.hideAlertFieldsLabel',
  {
    defaultMessage: 'Hide Kibana alert fields',
  }
);

interface TableTabSettingButtonProps {
  /**
   * The current state of the table tab
   */
  tableTabState: TableTabState;
  /**
   * The function to set the state of the table tab
   */
  setTableTabState: (tableTabState: TableTabState) => void;
  /**
   * The current state of the popover
   */
  isPopoverOpen: boolean;
  /**
   * The function to set the state of the popover
   */
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
  /**
   * Whether the document is an alert
   */
  isAlert: boolean;
}

/**
 * Settings button for the table tab.
 */
export const TableTabSettingButton = ({
  tableTabState,
  setTableTabState,
  isPopoverOpen,
  setIsPopoverOpen,
  isAlert,
}: TableTabSettingButtonProps) => {
  const { showHighlightedFields, hideEmptyFields, hideAlertFields } = tableTabState;
  const { euiTheme } = useEuiTheme();

  const onClick = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const onToggleShowHighlightedFields = useCallback(() => {
    setTableTabState({
      ...tableTabState,
      showHighlightedFields: !showHighlightedFields,
    });
  }, [showHighlightedFields, setTableTabState, tableTabState]);

  const onToggleHideEmptyFields = useCallback(() => {
    setTableTabState({
      ...tableTabState,
      hideEmptyFields: !hideEmptyFields,
    });
  }, [hideEmptyFields, setTableTabState, tableTabState]);

  const onToggleHideAlertFields = useCallback(() => {
    setTableTabState({
      ...tableTabState,
      hideAlertFields: !hideAlertFields,
    });
  }, [hideAlertFields, setTableTabState, tableTabState]);

  return (
    <EuiToolTip content={TABLE_TAB_SETTING_BUTTON_LABEL}>
      <EuiPopover
        button={
          <EuiButtonIcon
            aria-label={TABLE_TAB_SETTING_BUTTON_LABEL}
            onClick={onClick}
            iconType="gear"
            size="m"
            css={css`
              border: 1px solid ${euiTheme.colors.backgroundLightText};
              margin-left: -5px;
            `}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        display="block"
        data-test-subj={TABLE_TAB_SETTING_BUTTON_TEST_ID}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" direction="column">
          <EuiFlexItem>
            <EuiSwitch
              data-test-subj={TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID}
              label={HIGHLIGHTED_FIELDS_ONLY_LABEL}
              aria-label={HIGHLIGHTED_FIELDS_ONLY_LABEL}
              checked={showHighlightedFields}
              onChange={onToggleShowHighlightedFields}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSwitch
              data-test-subj={TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID}
              label={HIDE_EMPTY_FIELDS_LABEL}
              aria-label={HIDE_EMPTY_FIELDS_LABEL}
              checked={hideEmptyFields}
              onChange={onToggleHideEmptyFields}
              compressed
            />
          </EuiFlexItem>
          {isAlert && (
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj={TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID}
                label={HIDE_ALERT_FIELDS_LABEL}
                aria-label={HIDE_ALERT_FIELDS_LABEL}
                checked={hideAlertFields}
                onChange={onToggleHideAlertFields}
                compressed
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopover>
    </EuiToolTip>
  );
};
