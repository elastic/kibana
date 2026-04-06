/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useEventDetails } from '../../../flyout/document_details/shared/hooks/use_event_details';
import { TakeActionButton } from './take_action_button';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';

const TAKE_ACTION = i18n.translate('xpack.securitySolution.flyoutV2.footer.takeActionButtonLabel', {
  defaultMessage: 'Take action',
});

const TAKE_ACTION_LOADING = i18n.translate(
  'xpack.securitySolution.flyoutV2.footer.takeActionButtonLoadingLabel',
  { defaultMessage: 'Loading...' }
);

export interface TakeActionProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Callback invoked after alert mutations to refresh flyout data.
   */
  onAlertUpdated: () => void;
}

/**
 * Take action button in the panel footer
 * We show a loading button while we fetch the document.
 * If the call succeeds we show the Take action button.
 * If the call fails, we show a disabled button.
 * We're doing all of this to avoid having to refactor all the actions that are currently using dataAsNestedObject and dataFormattedForFieldBrowser/
 * // TODO: refactor all actions to take a DataTableRecord as input.
 */
export const TakeAction: FC<TakeActionProps> = ({ hit, onAlertUpdated }) => {
  const eventId = hit.raw._id;
  const indexName = hit.raw._index;

  const { dataAsNestedObject, dataFormattedForFieldBrowser, refetchFlyoutData, loading } =
    useEventDetails({
      eventId,
      indexName,
    });

  const nonEcsData = useMemo(
    () => dataFormattedForFieldBrowser?.map((d) => ({ field: d.field, value: d.values ?? null })),
    [dataFormattedForFieldBrowser]
  );

  if (loading) {
    return (
      <EuiButton data-test-subj={FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID} fill isLoading>
        {TAKE_ACTION_LOADING}
      </EuiButton>
    );
  }

  if (!dataAsNestedObject || !nonEcsData) {
    return (
      <EuiButton data-test-subj={FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID} fill isDisabled>
        {TAKE_ACTION}
      </EuiButton>
    );
  }

  return (
    <TakeActionButton
      hit={hit}
      ecsData={dataAsNestedObject}
      nonEcsData={nonEcsData}
      refetchFlyoutData={refetchFlyoutData}
      onAlertUpdated={onAlertUpdated}
    />
  );
};

TakeAction.displayName = 'TakeAction';
