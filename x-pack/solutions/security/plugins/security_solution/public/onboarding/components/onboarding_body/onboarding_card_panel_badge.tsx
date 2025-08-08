/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiBadge, EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CardBadge } from '../../types';

const label = {
  beta: i18n.translate('xpack.securitySolution.onboarding.cardBadge.beta', {
    defaultMessage: 'Beta',
  }),
  techPreview: i18n.translate('xpack.securitySolution.onboarding.cardBadge.techPreview', {
    defaultMessage: 'Technical Preview',
  }),
};
const tooltip = {
  beta: i18n.translate('xpack.securitySolution.onboarding.cardBadge.betaTooltip', {
    defaultMessage: 'This feature is in beta and is not recommended for production use.',
  }),
  techPreview: i18n.translate('xpack.securitySolution.onboarding.cardBadge.techPreviewTooltip', {
    defaultMessage: 'This feature is in technical preview and is subject to change.',
  }),
};

export const OnboardingCardBadge = React.memo<PropsWithChildren<{ badge: CardBadge }>>(
  ({ badge }) => {
    if (badge === 'beta') {
      return (
        <EuiBetaBadge
          label={label.beta}
          iconType="beta"
          tooltipContent={tooltip.beta}
          data-test-subj="onboardingCardBadge"
        />
      );
    }
    if (badge === 'tech_preview') {
      return (
        <EuiBetaBadge
          label={label.techPreview}
          iconType="beaker"
          tooltipContent={tooltip.techPreview}
          data-test-subj="onboardingCardBadge"
        />
      );
    }
    return <EuiBadge {...badge} data-test-subj="onboardingCardBadge" />;
  }
);
OnboardingCardBadge.displayName = 'OnboardingCardBadge';
