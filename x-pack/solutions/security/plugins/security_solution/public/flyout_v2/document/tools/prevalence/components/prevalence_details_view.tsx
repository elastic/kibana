/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { PrevalenceDetailsRow } from '../utils/get_columns';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../../main/constants/local_storage';
import { useLicense } from '../../../../../common/hooks/use_license';
import { usePrevalence } from '../hooks/use_prevalence';
import {
  PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID,
  PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID,
  PREVALENCE_DETAILS_DATE_PICKER_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
  PREVALENCE_DETAILS_UPSELL_TEST_ID,
} from '../test_ids';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

// This variable is used to track if the cold/frozen tier callout has been dismissed in the current tab session.
let isColdFrozenTierCalloutDismissedInTab = false;
// This function is used in tests to reset the callout dismissed state between tests, as the variable is shared across the entire tab session.
export const resetColdFrozenTierCalloutDismissedStateForTests = () => {
  isColdFrozenTierCalloutDismissedInTab = false;
};

export interface PrevalenceDetailsViewProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * List of investigation fields retrieved from the rule
   */
  investigationFields: string[];
  /**
   * Scope id, used for cell actions
   */
  scopeId: string;
  /**
   * Set of columns to render in the table
   */
  columns: Array<EuiBasicTableColumn<PrevalenceDetailsRow>>;
}

/**
 * Prevalence content view. Renders the date picker and table without any flyout chrome,
 * so it can be used both inside a flyout body and inline in a tab panel.
 */
export const PrevalenceDetailsView: React.FC<PrevalenceDetailsViewProps> = ({
  hit,
  investigationFields,
  scopeId,
  columns,
}) => {
  const { storage, uiSettings, serverless } = useKibana().services;
  const isServerless = !!serverless;
  const isColdAndFrozenTiersExcluded = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE
  );

  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const isPlatinumPlus = useLicense().isPlatinumPlus();

  const timeSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.PREVALENCE_TIME_RANGE);

  // these two are used by the usePrevalence hook to fetch the data
  const [start, setStart] = useState(timeSavedInLocalStorage?.start || DEFAULT_FROM);
  const [end, setEnd] = useState(timeSavedInLocalStorage?.end || DEFAULT_TO);

  // these two are used to pass to timeline
  const [absoluteStart, setAbsoluteStart] = useState(
    (dateMath.parse(timeSavedInLocalStorage?.start || DEFAULT_FROM) || new Date()).toISOString()
  );
  const [absoluteEnd, setAbsoluteEnd] = useState(
    (dateMath.parse(timeSavedInLocalStorage?.end || DEFAULT_TO) || new Date()).toISOString()
  );
  const [isColdFrozenTierCalloutDismissed, setIsColdFrozenTierCalloutDismissed] = useState(
    isColdFrozenTierCalloutDismissedInTab
  );

  // TODO update the logic to use a single set of start/end dates
  //  currently as we're using this InvestigateInTimelineButton component we need to pass the timeRange
  //  as an AbsoluteTimeRange, which requires from/to values
  const onTimeChange = useCallback(
    ({ start: s, end: e, isInvalid }: OnTimeChangeProps) => {
      if (isInvalid) return;

      storage.set(FLYOUT_STORAGE_KEYS.PREVALENCE_TIME_RANGE, { start: s, end: e });

      setStart(s);
      setEnd(e);

      const from = dateMath.parse(s);
      if (from && from.isValid()) {
        setAbsoluteStart(from.toISOString());
      }

      const to = dateMath.parse(e);
      if (to && to.isValid()) {
        setAbsoluteEnd(to.toISOString());
      }
    },
    [storage]
  );

  const onDismiss = useCallback(() => {
    isColdFrozenTierCalloutDismissedInTab = true;
    setIsColdFrozenTierCalloutDismissed(true);
  }, []);

  const { loading, error, data } = usePrevalence({
    hit,
    investigationFields,
    interval: {
      from: start,
      to: end,
    },
  });

  const euidApi = useEntityStoreEuidApi();
  const documentHostEntityIdentifiers = useMemo(
    () =>
      hit.flattened ? euidApi?.euid.getEntityIdentifiersFromDocument('host', hit.flattened) : null,
    [hit.flattened, euidApi?.euid]
  );
  const documentUserEntityIdentifiers = useMemo(
    () =>
      hit.flattened ? euidApi?.euid.getEntityIdentifiersFromDocument('user', hit.flattened) : null,
    [hit.flattened, euidApi?.euid]
  );

  // add timeRange to pass it down to timeline and license to drive the rendering of the last 2 prevalence columns
  const items = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        from: absoluteStart,
        to: absoluteEnd,
        isPlatinumPlus,
        scopeId,
        canUseTimeline,
        documentHostEntityIdentifiers,
        documentUserEntityIdentifiers,
      })),
    [
      data,
      absoluteStart,
      absoluteEnd,
      canUseTimeline,
      isPlatinumPlus,
      scopeId,
      documentHostEntityIdentifiers,
      documentUserEntityIdentifiers,
    ]
  );

  const upsell = (
    <>
      <EuiCallOut data-test-subj={PREVALENCE_DETAILS_UPSELL_TEST_ID}>
        <FormattedMessage
          id="xpack.securitySolution.flyout.prevalence.tableAlertUpsellDescription"
          defaultMessage="Host and user prevalence are only available with a {subscription}."
          values={{
            subscription: (
              <EuiLink href="https://www.elastic.co/pricing/" target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.flyout.prevalence.tableAlertUpsellLinkText"
                  defaultMessage="Platinum or higher subscription"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );

  const coldFrozenTierCallout = (
    <>
      <EuiCallOut
        data-test-subj={PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID}
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.prevalence.coldAndFrozenTiers.calloutTitle"
            defaultMessage="{state}"
            values={{
              state: isColdAndFrozenTiersExcluded
                ? 'Some data excluded'
                : 'Performance optimization',
            }}
          />
        }
        iconType="snowflake"
      >
        <EuiFlexGroup alignItems="flexStart" gutterSize="l" responsive={false}>
          <EuiFlexItem>
            <FormattedMessage
              id="xpack.securitySolution.flyout.prevalence.coldAndFrozenTiers.calloutDescription"
              defaultMessage="{state}, go to Advanced Settings or contact your administrator."
              values={{
                state: isColdAndFrozenTiersExcluded
                  ? 'Cold and frozen tiers are excluded to improve performance. To include them'
                  : 'This view loads more slowly because cold and frozen tiers are included. To change this',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={i18n.translate(
                'xpack.securitySolution.flyout.prevalence.coldAndFrozenTiers.dismissButtonAriaLabel',
                { defaultMessage: 'Dismiss cold and frozen tier callout' }
              )}
              data-test-subj={PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID}
              onClick={onDismiss}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.prevalence.coldAndFrozenTiers.dismissButtonLabel"
                defaultMessage="Dismiss"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );

  return (
    <>
      {!error && !isPlatinumPlus && upsell}
      {!isServerless && !isColdFrozenTierCalloutDismissed && coldFrozenTierCallout}
      <EuiSuperDatePicker
        start={start}
        end={end}
        onTimeChange={onTimeChange}
        data-test-subj={PREVALENCE_DETAILS_DATE_PICKER_TEST_ID}
        width="full"
      />
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        items={error ? [] : items}
        columns={columns}
        loading={loading}
        data-test-subj={PREVALENCE_DETAILS_TABLE_TEST_ID}
        tableCaption={i18n.translate('xpack.securitySolution.flyout.prevalence.prevalenceCaption', {
          defaultMessage: 'Prevalence insights',
        })}
        noItemsMessage={
          <FormattedMessage
            id="xpack.securitySolution.flyout.prevalence.noDataDescription"
            defaultMessage="No prevalence data available."
          />
        }
      />
    </>
  );
};

PrevalenceDetailsView.displayName = 'PrevalenceDetailsView';
