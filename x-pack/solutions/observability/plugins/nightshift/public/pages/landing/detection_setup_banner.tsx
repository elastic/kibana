/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBanner, EuiIllustration } from '@elastic/eui';
import { detection } from '@elastic/eui-illustrations';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';

const TITLE = i18n.translate('xpack.nightshift.detectionSetupBanner.title', {
  defaultMessage: 'Let Elastic nightshift discover events that require your attention',
});

const DESCRIPTION = i18n.translate('xpack.nightshift.detectionSetupBanner.description', {
  defaultMessage:
    'Set up your telemetry data sources and Elastic nightshift will analyze your data, alerts, and existing knowledge to find the events worth investigating, then prioritize them for you.',
});

const CONFIGURE_LABEL = i18n.translate(
  'xpack.nightshift.detectionSetupBanner.configureButtonLabel',
  {
    defaultMessage: 'Configure detection',
  }
);

const DISMISS_LABEL = i18n.translate('xpack.nightshift.detectionSetupBanner.dismissButtonLabel', {
  defaultMessage: 'Dismiss',
});

export const DetectionSetupBanner = ({
  detectionsHref,
  onDismiss,
}: {
  detectionsHref: string;
  onDismiss: () => void;
}): React.ReactElement => {
  return (
    <EuiBanner
      size="m"
      color="plain"
      title={TITLE}
      text={DESCRIPTION}
      headingElement="h3"
      aria-label={TITLE}
      data-test-subj="nightshiftDetectionSetupBanner"
      media={<EuiIllustration type={detection} alt="" />}
      actionProps={{
        primary: {
          children: CONFIGURE_LABEL,
          href: detectionsHref,
          iconType: 'radar',
          ...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.CONFIGURE_DETECTION,
            element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_SETUP_BANNER,
            detail: JSON.stringify({ entry: 'home_banner' }),
          }),
          'data-test-subj': 'nightshiftDetectionSetupBannerConfigureButton',
        },
      }}
      onDismiss={onDismiss}
      dismissButtonProps={{
        'aria-label': DISMISS_LABEL,
        'data-test-subj': 'nightshiftDetectionSetupBannerDismissButton',
      }}
    />
  );
};
