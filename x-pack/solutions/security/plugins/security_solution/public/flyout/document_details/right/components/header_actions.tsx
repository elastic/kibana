/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React, { memo } from 'react';
import { EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetFlyoutLink } from '../hooks/use_get_flyout_link';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../../shared/context';
import { SHARE_BUTTON_TEST_ID } from './test_ids';

/**
 * Actions displayed in the header menu in the right section of alerts flyout
 */
export const HeaderActions: VFC = memo(() => {
  const { dataFormattedForFieldBrowser, eventId, indexName } = useDocumentDetailsContext();
  const { isAlert, timestamp } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const alertDetailsLink = useGetFlyoutLink({
    eventId,
    indexName,
    timestamp,
  });

  const showShareAlertButton = isAlert && alertDetailsLink;

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="flexEnd"
      alignItems="center"
      gutterSize="none"
      responsive={false}
    >
      {showShareAlertButton && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.securitySolution.flyout.right.header.shareButtonToolTip',
              { defaultMessage: 'Share alert' }
            )}
          >
            <EuiCopy textToCopy={alertDetailsLink}>
              {(copy) => (
                <EuiButtonIcon
                  iconType={'share'}
                  color={'text'}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.flyout.right.header.shareButtonAriaLabel',
                    { defaultMessage: 'Share alert' }
                  )}
                  data-test-subj={SHARE_BUTTON_TEST_ID}
                  onClick={copy}
                  onKeyDown={copy}
                />
              )}
            </EuiCopy>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

HeaderActions.displayName = 'HeaderActions';
