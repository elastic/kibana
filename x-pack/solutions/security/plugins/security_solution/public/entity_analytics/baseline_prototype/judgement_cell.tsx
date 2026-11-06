/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useJudgementAvailable } from './baseline_prototype_state';
import {
  getJudgementBucket,
  getMockJudgement,
  isUnclear,
  JUDGEMENT_LABELS,
  UNCLEAR_CONFIDENCE_BELOW,
} from './prototype_data';

const BADGE_COLORS: readonly EuiBadgeProps['color'][] = ['success', 'warning', 'danger'];
const PROGRESS_COLORS = ['success', 'warning', 'danger'] as const;

const JUDGEMENT_LABEL_TEXT = [
  i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.judgementRoutine', {
    defaultMessage: 'Routine',
  }),
  i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.judgementSomewhat', {
    defaultMessage: 'Somewhat unusual',
  }),
  i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.judgementVery', {
    defaultMessage: 'Very unusual',
  }),
] as const;

const UNCLEAR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.judgementUnclear',
  { defaultMessage: 'Unclear' }
);
const UNCLEAR_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.judgementUnclearTooltip',
  {
    defaultMessage: 'The model is not confident about this alert (confidence below {threshold}).',
    values: { threshold: UNCLEAR_CONFIDENCE_BELOW },
  }
);
const NO_JUDGEMENT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.noJudgement',
  { defaultMessage: 'No judgement' }
);
const MOCK = i18n.translate('xpack.securitySolution.entityAnalytics.baselinePrototype.mock', {
  defaultMessage: 'Mock',
});
const POPOVER_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.popoverTitle',
  { defaultMessage: 'Is this alert normal for this entity?' }
);
const POPOVER_NOTE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.popoverNote',
  {
    defaultMessage:
      'Mock judgement. A decision model gives a judgement, not a score, and it can be wrong. Do not read the order inside "Somewhat unusual" as a ranking.',
  }
);
const COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.judgementColumn',
  { defaultMessage: 'Judgement' }
);
const MOCK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.baselinePrototype.mockTooltip',
  {
    defaultMessage:
      'Prototype. The judgements are mocked from real decision model answers on synthetic alerts.',
  }
);

/** The header of the Judgement column, with a Mock badge. */
export const JudgementColumnHeader: React.FC = () => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
    <EuiFlexItem grow={false}>{COLUMN_NAME}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content={MOCK_TOOLTIP}>
        <EuiBadge color="hollow" tabIndex={0}>
          {MOCK}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/**
 * DESIGN PROTOTYPE, NOT FOR MERGE.
 * The judgement of one alert: a bucket badge, an "Unclear" flag, and the probabilities in a popover.
 */
export const JudgementCell = memo(({ alertId }: { alertId: string }) => {
  const available = useJudgementAvailable();
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  if (!available) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="eaBaselineNoJudgement">
        {NO_JUDGEMENT}
      </EuiText>
    );
  }

  const judgement = getMockJudgement(alertId);
  const bucket = getJudgementBucket(judgement);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiBadge
              color={BADGE_COLORS[bucket]}
              onClick={togglePopover}
              onClickAriaLabel={POPOVER_TITLE}
              data-test-subj="eaBaselineJudgementBadge"
            >
              {JUDGEMENT_LABEL_TEXT[bucket]}
            </EuiBadge>
          }
          isOpen={isOpen}
          closePopover={closePopover}
          anchorPosition="downLeft"
          aria-label={POPOVER_TITLE}
        >
          <EuiPopoverTitle>{POPOVER_TITLE}</EuiPopoverTitle>
          <div style={{ width: 300 }}>
            {JUDGEMENT_LABELS.map((label, index) => (
              <EuiFlexGroup
                key={label}
                alignItems="center"
                gutterSize="s"
                responsive={false}
                wrap={false}
              >
                <EuiFlexItem grow={2}>
                  <EuiText size="xs">{JUDGEMENT_LABEL_TEXT[index]}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiProgress
                    value={Math.round(judgement.probabilities[index] * 100)}
                    max={100}
                    size="s"
                    color={PROGRESS_COLORS[index]}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <EuiText size="xs" textAlign="right">
                    {`${Math.round(judgement.probabilities[index] * 100)}%`}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.baselinePrototype.confidence',
                {
                  defaultMessage: 'Model confidence {confidence}',
                  values: { confidence: judgement.confidence },
                }
              )}
            </EuiText>
            <EuiText size="xs" color="subdued">
              {POPOVER_NOTE}
            </EuiText>
          </div>
        </EuiPopover>
      </EuiFlexItem>
      {isUnclear(judgement) && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={UNCLEAR_TOOLTIP}>
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="eaBaselineJudgementUnclear">
              {UNCLEAR}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});
JudgementCell.displayName = 'JudgementCell';
