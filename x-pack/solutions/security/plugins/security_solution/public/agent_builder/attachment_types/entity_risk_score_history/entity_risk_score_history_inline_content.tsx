/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiText, useEuiTheme, usePrettyDuration } from '@elastic/eui';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { DEFAULT_DATE_FORMAT } from '../../../../common/constants';
import { useUiSetting$ } from '../../../common/lib/kibana';
import {
  intervalToMs,
  RiskScoreTimelineChart,
} from '../../../entity_analytics/components/risk_score_timeline';
import type { EntityRiskScoreHistoryAttachment } from './types';

/**
 * Compact, read-only risk history chart for Agent Builder chat. Renders the
 * series embedded on the attachment (no client refetch / date picker). Full
 * interactivity (range presets + point-in-time contributions) lives in the
 * entity flyout via the "Open full risk history" action.
 */
export const EntityRiskScoreHistoryInlineContent: React.FC<
  AttachmentRenderProps<EntityRiskScoreHistoryAttachment>
> = ({ attachment }) => {
  const { data } = attachment;
  const minInterval = useMemo(() => intervalToMs(data.bucketInterval), [data.bucketInterval]);

  const { euiTheme } = useEuiTheme();
  const [dateFormat] = useUiSetting$<string>(DEFAULT_DATE_FORMAT);
  const rangeLabel = usePrettyDuration({
    timeFrom: data.from,
    timeTo: data.to,
    dateFormat,
  });

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
      <EuiText size="xs" textAlign="right" css={{ fontWeight: euiTheme.font.weight.bold }}>
        {rangeLabel}
      </EuiText>
      <EuiSpacer size="m" />
      <RiskScoreTimelineChart
        entries={data.entries}
        isLoading={false}
        isError={false}
        from={data.from}
        to={data.to}
        minInterval={minInterval}
        onPointSelect={() => undefined}
      />
    </EuiPanel>
  );
};
