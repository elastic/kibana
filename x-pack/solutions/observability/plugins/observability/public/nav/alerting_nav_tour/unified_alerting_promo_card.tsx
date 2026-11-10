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

const PROMO_TITLE = i18n.translate('xpack.observability.alertingNavTour.promoTitle', {
  defaultMessage: 'Unified Alerting app',
});
const PROMO_DESCRIPTION = i18n.translate('xpack.observability.alertingNavTour.promoDescription', {
  defaultMessage:
    'All your alerting features in one app. A unified experience to triage alerts, manage Universal and Classic rules, and control action policies and maintenance windows.',
});
const PROMO_IMAGE_ALT = i18n.translate('xpack.observability.alertingNavTour.promoImageAltText', {
  defaultMessage: 'Preview of the unified Alerting app',
});
const PROMO_TAKE_TOUR = i18n.translate('xpack.observability.alertingNavTour.takeTourButtonLabel', {
  defaultMessage: 'Take tour',
});
const PROMO_DISMISS = i18n.translate('xpack.observability.alertingNavTour.dismissPromoAriaLabel', {
  defaultMessage: 'Dismiss',
});

interface UnifiedAlertingPromoCardProps {
  onTakeTour: () => void;
  onDismiss: () => void;
  /** When false (tours disabled), hide the Take tour CTA. */
  showTakeTour?: boolean;
}

/** Compact promo card for the floating Unified Alerting entry on Alerts. */
export const UnifiedAlertingPromoCard: React.FC<UnifiedAlertingPromoCardProps> = ({
  onTakeTour,
  onDismiss,
  showTakeTour = true,
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
        {showTakeTour ? (
          <>
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
          </>
        ) : null}
      </div>
    </EuiPanel>
  );
};
