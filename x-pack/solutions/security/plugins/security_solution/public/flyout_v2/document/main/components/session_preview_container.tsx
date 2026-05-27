/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useLicense } from '../../../../common/hooks/use_license';
import { SessionPreview } from './session_preview';
import { useSessionViewConfig } from '../../tools/session_view/hooks/use_session_view_config';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import { SessionViewNotEnabled } from './session_view_not_enabled';

export interface SessionPreviewContainerProps {
  /**
   * Whether the navigation to session view should be disabled. This is true when in rule preview mode or when session view is not enabled, as in both cases we don't want to show the link to session view in the header.
   */
  disableNavigation: boolean;
  /**
   * DataTableRecord of the document for which session preview will be rendered
   */
  hit: DataTableRecord;
  /**
   * Callback when clicking on the header to show the session view. This should navigate the user to the session view.
   */
  onShowSessionView: () => void;
  /**
   * Whether to show the icon in the header which indicates that the panel is clickable. This should be true when the session view is enabled and we are not in rule preview mode, as in both cases we want to show the link to session view in the header.
   */
  showIcon: boolean;
}

/**
 * Checks if the SessionView component is available, if so render it or else render an error message
 */
export const SessionPreviewContainer = ({
  disableNavigation,
  hit,
  onShowSessionView,
  showIcon,
}: SessionPreviewContainerProps) => {
  // decide whether to show the session view or not
  const sessionViewConfig = useSessionViewConfig(hit);
  const isEnterprisePlus = useLicense().isEnterprise();
  const isEnabled = useMemo(
    () => sessionViewConfig && isEnterprisePlus,
    [sessionViewConfig, isEnterprisePlus]
  );
  const isNavigationEnabled = !(!isEnabled || disableNavigation);

  const iconType = useMemo(() => (showIcon ? 'arrowStart' : undefined), [showIcon]);

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.visualizations.sessionPreview.sessionPreviewTitle"
            defaultMessage="Session viewer preview"
          />
        ),
        iconType,
        ...(isNavigationEnabled && {
          link: {
            callback: onShowSessionView,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.document.visualizations.sessionPreview.sessionPreviewTooltip"
                defaultMessage="Investigate in Timeline"
              />
            ),
          },
        }),
      }}
      data-test-subj={SESSION_PREVIEW_TEST_ID}
    >
      {isEnabled ? (
        <SessionPreview disableNavigation={disableNavigation} hit={hit} />
      ) : (
        <SessionViewNotEnabled
          isEnterprisePlus={isEnterprisePlus}
          hasSessionViewConfig={sessionViewConfig !== null}
        />
      )}
    </ExpandablePanel>
  );
};
