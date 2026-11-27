/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { SecurityPageName } from '../../../../../common/constants';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { TabId } from '../../../pages/entity_analytics_management_header';
import { EDIT_WATCHLIST_URL_PARAM } from '../../watchlists/flyout/constants';
import { useUnsanctionedWatchlistNeedsSetup } from '../hooks/use_unsanctioned_watchlist_setup';
import { SETUP_CALLOUT_BODY, SETUP_CALLOUT_LINK, SETUP_CALLOUT_TITLE } from '../translations';

export const UNSANCTIONED_SETUP_CALLOUT_TEST_ID = 'aiSecurityUnsanctionedSetupCallout';

export interface UnsanctionedSetupCalloutProps {
  readonly watchlistId: string;
  readonly hasMemberRows: boolean;
}

/** Shown while the Unsanctioned AI agents watchlist has no source and no members, until dismissed. */
export const UnsanctionedSetupCallout = ({
  watchlistId,
  hasMemberRows,
}: UnsanctionedSetupCalloutProps) => {
  const isWatchlistsEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsWatchlistEnabled');
  const needsSetup = useUnsanctionedWatchlistNeedsSetup({ watchlistId, hasMemberRows });
  const [isDismissed, setIsDismissed] = useLocalStorage(
    `securitySolution.aiSecurity.unsanctionedSetupDismissed.${watchlistId}`,
    false
  );
  const onDismiss = useCallback(() => setIsDismissed(true), [setIsDismissed]);

  if (!isWatchlistsEnabled || !needsSetup || isDismissed) return null;

  return (
    <>
      <KbnInfoCallout
        size="s"
        title={SETUP_CALLOUT_TITLE}
        onDismiss={onDismiss}
        data-test-subj={UNSANCTIONED_SETUP_CALLOUT_TEST_ID}
        text={
          <>
            {SETUP_CALLOUT_BODY}{' '}
            <SecuritySolutionLinkAnchor
              deepLinkId={SecurityPageName.entityAnalyticsManagement}
              path={`/${TabId.Watchlists}?${EDIT_WATCHLIST_URL_PARAM}=${encodeURIComponent(
                watchlistId
              )}`}
              data-test-subj="aiSecurityUnsanctionedSetupLink"
            >
              {SETUP_CALLOUT_LINK}
            </SecuritySolutionLinkAnchor>
          </>
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
