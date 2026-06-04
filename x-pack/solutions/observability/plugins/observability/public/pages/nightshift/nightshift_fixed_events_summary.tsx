/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiAccordion,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import { FIXED_SIGNIFICANT_EVENTS } from './nightshift_critical_events';
import { SignificantEventRow } from './nightshift_significant_event_row';

export interface NightshiftFixedEventsSummaryProps {
  isExiting: boolean;
  onSummarise: () => void;
}

/**
 * Morning (and similar) bottom panel: accordion of fixed significant events
 * with Resolved badges, plus a single Summarise action.
 */
export const NightshiftFixedEventsSummary: React.FC<NightshiftFixedEventsSummaryProps> = ({
  isExiting,
  onSummarise,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'nightshiftFixedEvents' });
  const eventCount = FIXED_SIGNIFICANT_EVENTS.length;

  return (
    <>
      <EuiText size="s" color="subdued" data-test-subj="nightshiftFixedEventsIntro">
        <p>
          {i18n.translate('xpack.observability.nightshift.morning.fixedEventsIntro', {
            defaultMessage:
              'Significant events have been resolved with Elastic Agents in the last 8 hours. Expand the results to see each event.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiAccordion
        id={accordionId}
        arrowDisplay="right"
        data-test-subj="nightshiftFixedEventsAccordion"
        buttonContent={i18n.translate('xpack.observability.nightshift.morning.fixedEventsTitle', {
          defaultMessage: 'Fixed significant events ({count})',
          values: { count: eventCount },
        })}
        css={css`
          margin: 0 0 8px 0;
          .euiAccordion__button {
            font-weight: ${euiTheme.font.weight.semiBold};
            padding-left: 0;
            padding-right: 0;
          }
        `}
      >
        <div
          data-test-subj="nightshiftFixedEventsList"
          css={css`
            /*
             * The list sits inside the wrapping container's content
             * box so it never overflows past the parent panel's
             * \`overflow: hidden\` clipping boundary, regardless of
             * how wide the per-row badge or action cluster gets.
             * (Previously we escaped via \`margin: 0 -size.l\`, which
             * looks fine at the design width but clips badges/icons
             * on narrower layouts.)
             */
            width: 100%;
            box-sizing: border-box;
            border-top: ${euiTheme.border.thin};
          `}
        >
          {FIXED_SIGNIFICANT_EVENTS.map((event, idx) => (
            <SignificantEventRow
              key={event.id}
              event={event}
              isLast={idx === FIXED_SIGNIFICANT_EVENTS.length - 1}
              displayStatus="resolved"
              testSubjPrefix="nightshiftFixedEvent"
            />
          ))}
        </div>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <AiButton
        variant="base"
        size="s"
        iconType="productAgent"
        data-test-subj="nightshiftMorningSummarise"
        isDisabled={isExiting}
        onClick={onSummarise}
      >
        {i18n.translate('xpack.observability.nightshift.morning.summarise', {
          defaultMessage: 'Summarise',
        })}
      </AiButton>
    </>
  );
};
