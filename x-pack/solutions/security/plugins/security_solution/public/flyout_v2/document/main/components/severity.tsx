/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { upperFirst } from 'lodash/fp';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { AlertEpisodeSeverityBadge } from '@kbn/alerting-v2-episodes-ui/components/severity/episode_severity_badge';
import { isSupportedEpisodeSeverity } from '@kbn/alerting-v2-episodes-ui/components/severity/severity_utils';
import { SEVERITY_VALUE_TEST_ID } from './test_ids';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

export const EVENT_SEVERITY = 'event.severity';

const isSeverity = (x: unknown): x is Severity =>
  x === 'low' || x === 'medium' || x === 'high' || x === 'critical';

export interface DocumentSeverityProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional content rendered after the badge (e.g. a spacer).
   * When omitted nothing is rendered after the badge.
   */
  children?: ReactNode;
}

/**
 * Document details severity displayed in flyout right section header
 */
export const DocumentSeverity = memo(({ hit, children }: DocumentSeverityProps) => {
  const { euiTheme } = useEuiTheme();

  const severityToColorMap = useRiskSeverityColors();

  const severity = useMemo(() => {
    const alertSeverity = getFieldValue(hit, ALERT_SEVERITY);

    if (typeof alertSeverity === 'string' || typeof alertSeverity === 'number') {
      return alertSeverity;
    }

    const eventSeverity = getFieldValue(hit, EVENT_SEVERITY);

    if (typeof eventSeverity === 'string' || typeof eventSeverity === 'number') {
      return eventSeverity;
    }

    return null;
  }, [hit]);

  const displayValue = useMemo(() => {
    if (severity == null) {
      return null;
    }

    return typeof severity === 'string' ? upperFirst(severity) : String(severity);
  }, [severity]);

  const color = useMemo(
    () =>
      typeof severity === 'string' && isSeverity(severity)
        ? severityToColorMap[severity]
        : euiTheme.colors.textSubdued,
    [severity, euiTheme.colors.textSubdued, severityToColorMap]
  );

  // v2 episodes carry a top-level `severity`; render it with the RnA badge so colors/labels match
  // the platform episodes page. `AlertEpisodeSeverityBadge` returns null for unsupported values, so
  // we gate the trailing `children` (spacer) the same way v1 gates on a present value.
  const isEpisode = getFieldValue(hit, 'episode.id') != null;
  if (isEpisode) {
    const episodeSeverity = getFieldValue(hit, 'severity') as string | undefined | null;
    if (!isSupportedEpisodeSeverity(episodeSeverity)) {
      return null;
    }
    return (
      <>
        <AlertEpisodeSeverityBadge severity={episodeSeverity} />
        {children}
      </>
    );
  }

  return (
    <>
      {displayValue != null && (
        <>
          <EuiBadge color={color} data-test-subj={SEVERITY_VALUE_TEST_ID}>
            {displayValue}
          </EuiBadge>
          {children}
        </>
      )}
    </>
  );
});

DocumentSeverity.displayName = 'DocumentSeverity';
