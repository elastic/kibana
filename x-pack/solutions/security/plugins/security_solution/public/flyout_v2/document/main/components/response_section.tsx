/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { defaultToolsFlyoutProperties } from '../../../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import { ResponseDetails } from '../../tools/response';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { ResponseSectionContent } from './response_section_content';

export interface ResponseSectionProps {
  /**
   * Document to display in the overview tab.
   */
  hit: DataTableRecord;
  /**
   * Whether the flyout is opened in rule preview mode.
   */
  isRulePreview?: boolean;
}

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 * Constructs the v2 tools flyout callback and forwards rendering to {@link ResponseSectionContent}.
 */
export const ResponseSection = memo<ResponseSectionProps>(({ hit, isRulePreview = false }) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  const onShowResponseDetails = useCallback(() => {
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <ResponseDetails hit={hit} />,
      }),
      {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      }
    );
  }, [history, historyKey, hit, overlays, services, store]);

  return (
    <ResponseSectionContent
      hit={hit}
      isRulePreview={isRulePreview}
      onShowResponseDetails={onShowResponseDetails}
    />
  );
});

ResponseSection.displayName = 'ResponseSection';
