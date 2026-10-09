/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ALERTING_NAV_PROMO_CARD_TEST_ID,
  ALERTING_NAV_PROMO_DISMISS_TEST_ID,
  ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID,
  PROMO_IMAGE_ASPECT_RATIO,
} from './constants';
import promoImageDark from './assets/alerting_promo_dark.webp';
import promoImageLight from './assets/alerting_promo_light.webp';
import * as i18n from './translations';

interface UnifiedAlertingPromoCardProps {
  onTakeTour: () => void;
  onDismiss: () => void;
}

/**
 * Compact promo card for the Alerting side-nav panel footer. Matches the
 * Unified Alerting app marketing card and starts the guided tour.
 */
export const UnifiedAlertingPromoCard: React.FC<UnifiedAlertingPromoCardProps> = ({
  onTakeTour,
  onDismiss,
}) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const promoImage = colorMode.toUpperCase() === 'DARK' ? promoImageDark : promoImageLight;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      borderRadius="m"
      color="plain"
      data-test-subj={ALERTING_NAV_PROMO_CARD_TEST_ID}
      css={css`
        position: relative;
        margin: ${euiTheme.size.s};
        overflow: hidden;
      `}
    >
      <div
        css={css`
          position: absolute;
          top: ${euiTheme.size.xs};
          right: ${euiTheme.size.xs};
          z-index: 1;
        `}
      >
        <EuiToolTip content={i18n.PROMO_DISMISS} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            size="xs"
            onClick={onDismiss}
            aria-label={i18n.PROMO_DISMISS}
            data-test-subj={ALERTING_NAV_PROMO_DISMISS_TEST_ID}
            css={css`
              background-color: ${euiTheme.colors.backgroundBasePlain};
            `}
          />
        </EuiToolTip>
      </div>
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: ${PROMO_IMAGE_ASPECT_RATIO};
          overflow: hidden;
          line-height: 0;
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <img
          alt={i18n.PROMO_IMAGE_ALT}
          src={promoImage}
          data-test-subj="alertingNavPromoCardImage"
          css={css`
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
          `}
        />
      </div>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{i18n.PROMO_TITLE}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>{i18n.PROMO_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            fullWidth
            size="s"
            color="text"
            iconType="map"
            onClick={onTakeTour}
            data-test-subj={ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID}
          >
            {i18n.PROMO_TAKE_TOUR}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
