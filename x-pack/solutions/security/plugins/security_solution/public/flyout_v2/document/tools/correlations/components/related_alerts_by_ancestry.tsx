/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiCallOut, EuiSpacer, EuiSuperDatePicker } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CorrelationsDetailsAlertsTable } from './correlations_details_alerts_table';
import { useFetchRelatedAlertsByAncestry } from '../../../main/hooks/use_fetch_related_alerts_by_ancestry';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_DATE_PICKER_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_ERROR_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID,
} from './test_ids';
import { getColumns } from '../utils/get_columns';
import { useSecurityDefaultPatterns } from '../../../../../data_view_manager/hooks/use_security_default_patterns';
import { useKibana } from '../../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../../main/constants/local_storage';

const DEFAULT_FROM = 'now-1d';
const DEFAULT_TO = 'now';

export interface RelatedAlertsByAncestryProps {
  /**
   * Id of the document
   */
  documentId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Callback to open the alert preview
   */
  onShowAlert: (id: string, indexName: string, title?: string) => void;
  /**
   * Whether to render rule links as PreviewLink (legacy expandable flyout) instead of OpenFlyoutLink (new flyout system)
   */
  useLegacyExpandableFlyout: boolean;
}

/**
 * Show related alerts by ancestry in an expandable panel with a table.
 * Renders a date picker to bound the underlying resolver tree query, since it can otherwise scan
 * an unbounded amount of data. The selected range is persisted to local storage.
 */
export const RelatedAlertsByAncestry: React.FC<RelatedAlertsByAncestryProps> = ({
  documentId,
  scopeId,
  onShowAlert,
  useLegacyExpandableFlyout,
}) => {
  const { storage } = useKibana().services;
  const { indexPatterns } = useSecurityDefaultPatterns();

  const timeSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.ANCESTRY_ALERTS_TIME_RANGE);

  const [start, setStart] = useState(timeSavedInLocalStorage?.start || DEFAULT_FROM);
  const [end, setEnd] = useState(timeSavedInLocalStorage?.end || DEFAULT_TO);

  const onTimeChange = useCallback(
    ({ start: s, end: e, isInvalid }: OnTimeChangeProps) => {
      if (isInvalid) return;

      storage.set(FLYOUT_STORAGE_KEYS.ANCESTRY_ALERTS_TIME_RANGE, { start: s, end: e });

      setStart(s);
      setEnd(e);
    },
    [storage]
  );

  const { loading, error, data, dataCount, refetch } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices: indexPatterns,
    interval: { from: start, to: end },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const columns = useMemo(
    () =>
      getColumns({
        scopeId,
        dataTestSubj: CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID,
        onShowAlert,
        useLegacyExpandableFlyout,
      }),
    [scopeId, onShowAlert, useLegacyExpandableFlyout]
  );

  return (
    <>
      <EuiSuperDatePicker
        start={start}
        end={end}
        onTimeChange={onTimeChange}
        onRefresh={onRefresh}
        isLoading={loading}
        data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_DATE_PICKER_TEST_ID}
        width="full"
      />
      <EuiSpacer size="m" />
      {error ? (
        <EuiCallOut
          color="danger"
          iconType="warning"
          data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_ERROR_TEST_ID}
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.correlations.ancestryAlertsErrorTitle"
              defaultMessage="Unable to load alerts related by ancestry"
            />
          }
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.correlations.ancestryAlertsErrorDescription"
            defaultMessage="Try narrowing the selected time range and refreshing."
          />
        </EuiCallOut>
      ) : (
        <CorrelationsDetailsAlertsTable
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.correlations.ancestryAlertsTitle"
              defaultMessage="{count} {count, plural, one {alert} other {alerts}} related by ancestry"
              values={{ count: dataCount }}
            />
          }
          loading={loading}
          alertIds={data}
          scopeId={scopeId}
          eventId={documentId}
          noItemsMessage={
            <FormattedMessage
              id="xpack.securitySolution.flyout.correlations.ancestryAlertsNoDataDescription"
              defaultMessage="No alerts related by ancestry."
            />
          }
          columns={columns}
          data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}
        />
      )}
    </>
  );
};

RelatedAlertsByAncestry.displayName = 'RelatedAlertsByAncestry';
