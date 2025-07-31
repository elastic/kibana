/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLicense } from '../../../../common/hooks/use_license';
import { SessionPreview } from './session_preview';
import { useSessionViewConfig } from '../../shared/hooks/use_session_view_config';
import { useDocumentDetailsContext } from '../../shared/context';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import { useNavigateToSessionView } from '../../shared/hooks/use_navigate_to_session_view';
import { SessionViewNoDataMessage } from '../../shared/components/session_view_no_data_message';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

/**
 * Checks if the SessionView component is available, if so render it or else render an error message
 */
export const SessionPreviewContainer: FC = () => {
  const {
    eventId,
    indexName,
    scopeId,
    getFieldsData,
    isRulePreview,
    isPreviewMode,
    dataFormattedForFieldBrowser,
  } = useDocumentDetailsContext();

  // decide whether to show the session view or not
  const sessionViewConfig = useSessionViewConfig({ getFieldsData, dataFormattedForFieldBrowser });
  const isEnterprisePlus = useLicense().isEnterprise();
  const isEnabled = sessionViewConfig && isEnterprisePlus;

  const isNewNavigationEnabled = !useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationDisabled'
  );

  const { navigateToSessionView } = useNavigateToSessionView({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
    isPreviewMode,
  });

  const iconType = useMemo(() => (!isPreviewMode ? 'arrowStart' : undefined), [isPreviewMode]);

  const isNavigationEnabled = useMemo(() => {
    // if the session view is not enabled or in rule preview mode, the navigation is not enabled
    if (!isEnabled || isRulePreview) {
      return false;
    }
    // if the new navigation is enabled, the navigation is enabled (flyout or timeline)
    if (isNewNavigationEnabled) {
      return true;
    }
    // if the new navigation is not enabled, the navigation is enabled if the flyout is not in preview mode
    return !isPreviewMode;
  }, [isNewNavigationEnabled, isPreviewMode, isEnabled, isRulePreview]);

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.sessionPreviewTitle"
            defaultMessage="Session viewer preview"
          />
        ),
        iconType,
        ...(isNavigationEnabled && {
          link: {
            callback: navigateToSessionView,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.sessionPreviewTooltip"
                defaultMessage="Investigate in timeline"
              />
            ),
          },
        }),
      }}
      data-test-subj={SESSION_PREVIEW_TEST_ID}
    >
      {isEnabled ? (
        <SessionPreview />
      ) : (
        <SessionViewNoDataMessage
          isEnterprisePlus={isEnterprisePlus}
          hasSessionViewConfig={sessionViewConfig !== null}
        />
      )}
    </ExpandablePanel>
  );
};
