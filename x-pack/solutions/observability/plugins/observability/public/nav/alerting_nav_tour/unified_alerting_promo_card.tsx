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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import promoImageDark from './assets/alerting_promo_dark.webp';
import promoImageLight from './assets/alerting_promo_light.webp';

export const ALERTING_NAV_PROMO_CARD_TEST_ID = 'alertingNavPromoCard';
export const ALERTING_NAV_PROMO_TAKE_TOUR_TEST_ID = 'alertingNavPromoTakeTour';
export const ALERTING_NAV_PROMO_DISMISS_TEST_ID = 'alertingNavPromoDismiss';

/** Promo webp intrinsic size (448×240). */
const PROMO_IMAGE_ASPECT_RATIO = '448 / 240';

const PROMO_TITLE = i18n.translate('xpack.observability.alertingNavTour.promo.title', {
  defaultMessage: 'Unified Alerting app',
});
const PROMO_DESCRIPTION = i18n.translate('xpack.observability.alertingNavTour.promo.description', {
  defaultMessage:
    'All your alerting features in one place. Triage alerts, manage rules, notifications and suppression mechanisms.',
});
const PROMO_IMAGE_ALT = i18n.translate('xpack.observability.alertingNavTour.promo.imageAlt', {
  defaultMessage: 'Preview of the unified Alerting app',
});
const PROMO_TAKE_TOUR = i18n.translate('xpack.observability.alertingNavTour.promo.takeTour', {
  defaultMessage: 'Take tour',
});
const PROMO_DISMISS = i18n.translate('xpack.observability.alertingNavTour.promo.dismiss', {
  defaultMessage: 'Dismiss',
});

interface UnifiedAlertingPromoCardProps {
  onTakeTour: () => void;
  onDismiss: () => void;
}

/** Compact promo card for the Alerting side-nav panel footer. */
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
        <EuiToolTip content={PROMO_DISMISS} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            size="xs"
            onClick={onDismiss}
            aria-label={PROMO_DISMISS}
            data-test-subj={ALERTING_NAV_PROMO_DISMISS_TEST_ID}
            css={css`
              background-color: ${euiTheme.colors.backgroundBasePlain};
            `}
          />
        </EuiToolTip>
      </div>
      <div
        css={css`
          width: 100%;
          aspect-ratio: ${PROMO_IMAGE_ASPECT_RATIO};
          overflow: hidden;
          line-height: 0;
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <img
          alt={PROMO_IMAGE_ALT}
          src={promoImage}
          data-test-subj="alertingNavPromoCardImage"
          css={css`
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
        />
      </div>
      <div
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        <EuiTitle size="xs">
          <h3>{PROMO_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>{PROMO_DESCRIPTION}</p>
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
          {PROMO_TAKE_TOUR}
        </EuiButton>
      </div>
    </EuiPanel>
  );
};
