/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFlyoutApi } from '@kbn/flyout';
import { TakeActionButton } from '../shared/components/take_action_button';
import { getField } from '../shared/utils';
import { EventKind } from '../shared/constants/event_kinds';
import { DocumentDetailsRightPanelKey } from '../shared/constants/panel_keys';
import { useDocumentDetailsContext } from '../shared/context';
import { PREVIEW_FOOTER_LINK_TEST_ID, PREVIEW_FOOTER_TEST_ID } from './test_ids';

/**
 * Footer at the bottom of preview panel with a link to open document details flyout
 */
export const PreviewPanelFooter: FC = () => {
  const { eventId, indexName, scopeId, getFieldsData, isRulePreview } = useDocumentDetailsContext();
  const { openFlyout } = useFlyoutApi();

  const isAlert = useMemo(
    () => getField(getFieldsData('event.kind')) === EventKind.signal,
    [getFieldsData]
  );

  const openDocumentFlyout = useCallback(() => {
    openFlyout(
      {
        main: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId,
            isChild: false,
          },
        },
      },
      { mainSize: 's' }
    );
  }, [scopeId, eventId, indexName, openFlyout]);

  const fullDetailsLink = useMemo(
    () => (
      <EuiLink
        onClick={openDocumentFlyout}
        target="_blank"
        data-test-subj={PREVIEW_FOOTER_LINK_TEST_ID}
      >
        <>
          {i18n.translate('xpack.securitySolution.flyout.preview.openFlyoutLabel', {
            values: { isAlert },
            defaultMessage: 'Show full {isAlert, select, true{alert} other{event}} details',
          })}
        </>
      </EuiLink>
    ),
    [isAlert, openDocumentFlyout]
  );

  if (isRulePreview) return null;

  return (
    <EuiFlyoutFooter data-test-subj={PREVIEW_FOOTER_TEST_ID}>
      <EuiPanel color="transparent" paddingSize="none">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>{fullDetailsLink}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TakeActionButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
