/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { useIsAnalyzerEnabled } from '../../detections/hooks/use_is_analyzer_enabled';
import { useNavigateToAnalyzer } from '../../flyout/document_details/shared/hooks/use_navigate_to_analyzer';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import type { DetonationAlert } from '../hooks/use_detonation_alerts';
import { toAnalyzerRecord } from '../hooks/use_detonation_alerts';
import { DETAIL_OPEN_ANALYZER } from '../translations';

/** Scope used by the flyout when the analyzer is opened from this page. */
const DETONATE_SCOPE_ID = 'detonate-detail';

interface AlertAnalyzerActionProps {
  alert: DetonationAlert;
}

/**
 * Row action that opens the process analyzer for one alert. Like the Alerts page, it renders
 * nothing for alerts the analyzer cannot resolve a process tree from.
 */
const AlertAnalyzerActionComponent: React.FC<AlertAnalyzerActionProps> = ({ alert }) => {
  const record = toAnalyzerRecord(alert);
  const isAnalyzerEnabled = useIsAnalyzerEnabled(record);

  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const { openAnalyzer } = useFlyoutApi();

  const { navigateToAnalyzer } = useNavigateToAnalyzer({
    isFlyoutOpen: false,
    eventId: alert._id,
    indexName: alert._index,
    scopeId: DETONATE_SCOPE_ID,
  });

  const showAnalyzer = useCallback(() => {
    if (isNewFlyoutEnabled) {
      openAnalyzer({ hit: record });
      return;
    }
    navigateToAnalyzer();
  }, [isNewFlyoutEnabled, openAnalyzer, record, navigateToAnalyzer]);

  if (!isAnalyzerEnabled) {
    return null;
  }

  return (
    <EuiToolTip content={DETAIL_OPEN_ANALYZER} disableScreenReaderOutput>
      <EuiButtonIcon
        aria-label={DETAIL_OPEN_ANALYZER}
        color="text"
        data-test-subj="detonateOpenAnalyzer"
        iconType="analyzeEvent"
        onClick={showAnalyzer}
      />
    </EuiToolTip>
  );
};

export const AlertAnalyzerAction = React.memo(AlertAnalyzerActionComponent);
