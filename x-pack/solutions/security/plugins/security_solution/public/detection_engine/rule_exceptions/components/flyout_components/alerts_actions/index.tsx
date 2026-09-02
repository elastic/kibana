/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';

import { EuiCallOut, EuiCheckbox, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import type { Status } from '../../../../../../common/api/detection_engine';
import { entryHasNonEcsType, shouldDisableBulkClose } from './utils';
import * as i18n from './translations';
import type { AlertData } from '../../../utils/types';

const FlyoutCheckboxesSection = styled.section`
  overflow-y: inherit;
  height: auto;
  .euiFlyoutBody__overflowContent {
    padding-top: 0;
  }
`;

const SectionHeader = styled(EuiTitle)`
  font-weight: ${({ theme }) => theme.euiTheme.font.weight.semiBold};
`;

interface ExceptionsFlyoutAlertsActionsComponentProps {
  exceptionListItems: ExceptionsBuilderReturnExceptionItem[];
  exceptionListType: ExceptionListType;
  shouldBulkCloseAlert: boolean;
  disableBulkClose: boolean;
  alertData?: AlertData;
  alertStatus?: Status;
  isAlertDataLoading?: boolean;
  shouldCloseSingleAlert?: boolean;
  isSignalIndexLoading: boolean;
  signalIndexNames: string[];
  isSignalIndexPatternLoading: boolean;
  signalIndexPatterns: DataViewBase;
  /**
   * True when any runtime field fell back to `keyword` because its type
   * couldn't be resolved against the rule's source indices.
   */
  hasUntypedRuntimeFields?: boolean;
  onUpdateBulkCloseIndex: (arg: string[] | undefined) => void;
  onBulkCloseCheckboxChange: (arg: boolean) => void;
  onSingleAlertCloseCheckboxChange?: (arg: boolean) => void;
  onDisableBulkClose: (arg: boolean) => void;
}

const ExceptionItemsFlyoutAlertsActionsComponent: React.FC<
  ExceptionsFlyoutAlertsActionsComponentProps
> = ({
  isAlertDataLoading,
  exceptionListItems,
  exceptionListType,
  shouldCloseSingleAlert,
  shouldBulkCloseAlert,
  disableBulkClose,
  alertData,
  alertStatus,
  isSignalIndexLoading,
  signalIndexNames,
  isSignalIndexPatternLoading,
  signalIndexPatterns,
  hasUntypedRuntimeFields = false,
  onDisableBulkClose,
  onUpdateBulkCloseIndex,
  onBulkCloseCheckboxChange,
  onSingleAlertCloseCheckboxChange,
}): JSX.Element => {
  const handleBulkCloseCheckbox = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onBulkCloseCheckboxChange(event.currentTarget.checked);
    },
    [onBulkCloseCheckboxChange]
  );

  const handleCloseSingleAlertCheckbox = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      if (onSingleAlertCloseCheckboxChange != null) {
        onSingleAlertCloseCheckboxChange(event.currentTarget.checked);
      }
    },
    [onSingleAlertCloseCheckboxChange]
  );

  useEffect(() => {
    onUpdateBulkCloseIndex(shouldBulkCloseAlert ? signalIndexNames : undefined);
  }, [signalIndexNames, onUpdateBulkCloseIndex, shouldBulkCloseAlert]);

  useEffect((): void => {
    if (disableBulkClose === true) {
      onBulkCloseCheckboxChange(false);
    }
  }, [disableBulkClose, onBulkCloseCheckboxChange]);

  useEffect((): void => {
    onDisableBulkClose(shouldDisableBulkClose({ items: exceptionListItems }));
  }, [onDisableBulkClose, exceptionListItems]);

  // Exception entries referencing fields not on the alerts index — typically
  // runtime or non-ECS fields defined on the rule's source indices. Bulk-close
  // still proceeds for those (server resolves via runtime-field synthesis),
  // but a warning callout sets expectations about coverage.
  const showRuntimeFieldWarning = useMemo(
    () =>
      shouldBulkCloseAlert &&
      isSignalIndexPatternLoading === false &&
      entryHasNonEcsType(exceptionListItems, signalIndexPatterns),
    [shouldBulkCloseAlert, isSignalIndexPatternLoading, exceptionListItems, signalIndexPatterns]
  );

  return (
    <FlyoutCheckboxesSection>
      <SectionHeader size="xs">
        <h3>{i18n.CLOSE_ALERTS_SECTION_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      {alertData != null && alertStatus !== 'closed' && (
        <EuiFormRow fullWidth>
          <EuiCheckbox
            data-test-subj="closeAlertOnAddExceptionCheckbox"
            id="close-alert-on-add-add-exception-checkbox"
            label={i18n.SINGLE_ALERT_CLOSE_LABEL}
            checked={shouldCloseSingleAlert}
            onChange={handleCloseSingleAlertCheckbox}
            disabled={isSignalIndexLoading || isAlertDataLoading}
          />
        </EuiFormRow>
      )}
      <EuiFormRow fullWidth>
        <EuiCheckbox
          data-test-subj="bulkCloseAlertOnAddExceptionCheckbox"
          id="bulk-close-alert-on-add-add-exception-checkbox"
          label={disableBulkClose ? i18n.BULK_CLOSE_LABEL_DISABLED : i18n.BULK_CLOSE_LABEL}
          checked={shouldBulkCloseAlert}
          onChange={handleBulkCloseCheckbox}
          disabled={disableBulkClose || isSignalIndexLoading || isAlertDataLoading}
        />
      </EuiFormRow>
      {showRuntimeFieldWarning && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            data-test-subj="bulkCloseRuntimeFieldWarning"
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_TITLE}
          >
            <p>{i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_BODY}</p>
            {hasUntypedRuntimeFields && <p>{i18n.BULK_CLOSE_RUNTIME_FIELD_WARNING_UNTYPED_BODY}</p>}
          </EuiCallOut>
        </>
      )}
      {exceptionListType === 'endpoint' && (
        <>
          <EuiSpacer size="s" />
          <EuiText data-test-subj="addExceptionEndpointText" color="subdued" size="s">
            {i18n.ENDPOINT_QUARANTINE_TEXT}
          </EuiText>
        </>
      )}
    </FlyoutCheckboxesSection>
  );
};

export const ExceptionItemsFlyoutAlertsActions = React.memo(
  ExceptionItemsFlyoutAlertsActionsComponent
);

ExceptionItemsFlyoutAlertsActions.displayName = 'ExceptionItemsFlyoutAlertsActions';
