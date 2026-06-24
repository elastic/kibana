/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';

import { EuiCallOut, EuiCheckbox, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useFetchIndex } from '../../../../../common/containers/source';
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
  onDisableBulkClose,
  onUpdateBulkCloseIndex,
  onBulkCloseCheckboxChange,
  onSingleAlertCloseCheckboxChange,
}): JSX.Element => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();
  const memoSignalIndexName = useMemo(
    () => (signalIndexName !== null ? [signalIndexName] : []),
    [signalIndexName]
  );

  // The alerts wildcard data view is used purely to detect when the exception
  // references fields that are not on the alerts index — typically runtime or
  // non-ECS fields defined on the rule's source indices. When that's the case,
  // bulk-close still proceeds (server resolves via runtime-field synthesis),
  // but we surface a warning callout to set expectations about coverage.
  const [isSignalIndexPatternLoading, { indexPatterns: signalIndexPatterns }] =
    useFetchIndex(memoSignalIndexName);

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
    onUpdateBulkCloseIndex(
      shouldBulkCloseAlert && memoSignalIndexName != null ? memoSignalIndexName : undefined
    );
  }, [memoSignalIndexName, onUpdateBulkCloseIndex, shouldBulkCloseAlert]);

  useEffect((): void => {
    if (disableBulkClose === true) {
      onBulkCloseCheckboxChange(false);
    }
  }, [disableBulkClose, onBulkCloseCheckboxChange]);

  useEffect((): void => {
    onDisableBulkClose(shouldDisableBulkClose({ items: exceptionListItems }));
  }, [onDisableBulkClose, exceptionListItems]);

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
