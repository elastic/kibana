/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { InfoPopoverBody } from '../info_popover_body';
import { getTimerPrefix } from './last_times_popover/helpers';
import * as i18n from '../translations';
import { useKibanaFeatureFlags } from '../../use_kibana_feature_flags';

const TEXT_COLOR = '#343741';

interface Props {
  approximateFutureTime: Date | null;
  averageSuccessfulDurationNanoseconds?: number;
  connectorIntervals: GenerationInterval[];
  successfulGenerations?: number;
}

const CountdownComponent: React.FC<Props> = ({
  approximateFutureTime,
  averageSuccessfulDurationNanoseconds,
  connectorIntervals,
  successfulGenerations,
}) => {
  // theming:
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();

  // popover state:
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onClick = useCallback(() => setIsPopoverOpen(true), []);

  // state for the timer prefix, and timer text:
  const [prefix, setPrefix] = useState<string>(getTimerPrefix(approximateFutureTime));
  const [timerText, setTimerText] = useState('');

  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  useEffect(() => {
    // periodically update the formatted date as time passes:
    if (approximateFutureTime === null) {
      return;
    }
    const intervalId = setInterval(() => {
      setPrefix(getTimerPrefix(approximateFutureTime));
      if (approximateFutureTime !== null) {
        const now = moment();

        const duration = moment(approximateFutureTime).isSameOrAfter(now)
          ? moment.duration(moment(approximateFutureTime).diff(now))
          : moment.duration(now.diff(approximateFutureTime));

        const text = moment.utc(duration.asMilliseconds()).format('mm:ss');
        setTimerText(text);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [approximateFutureTime]);

  const iconInQuestionButton = useMemo(
    () => <EuiButtonIcon aria-label={i18n.INFORMATION} iconType="question" onClick={onClick} />,
    [onClick]
  );

  if (
    (!attackDiscoveryAlertsEnabled && connectorIntervals.length === 0) ||
    (attackDiscoveryAlertsEnabled && approximateFutureTime == null)
  ) {
    return null; // don't render anything if there's no data
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="countdown"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiOutsideClickDetector isDisabled={!isPopoverOpen} onOutsideClick={() => closePopover()}>
          <EuiPopover
            anchorPosition="upCenter"
            button={iconInQuestionButton}
            closePopover={closePopover}
            data-test-subj="infoPopover"
            isOpen={isPopoverOpen}
          >
            <InfoPopoverBody
              averageSuccessfulDurationNanoseconds={averageSuccessfulDurationNanoseconds}
              connectorIntervals={connectorIntervals}
              successfulGenerations={successfulGenerations}
            />
          </EuiPopover>
        </EuiOutsideClickDetector>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          color={isDarkMode ? 'subdued' : TEXT_COLOR}
          css={css`
            font-weight: 400;
            margin-left: ${euiTheme.size.xs};
          `}
          data-test-subj="prefix"
          size="s"
        >
          {prefix}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem
        css={css`
          margin-left: ${euiTheme.size.s};
        `}
        data-test-subj="timerText"
        grow={false}
      >
        {timerText}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CountdownComponent.displayName = 'Countdown';

export const Countdown = React.memo(CountdownComponent);
