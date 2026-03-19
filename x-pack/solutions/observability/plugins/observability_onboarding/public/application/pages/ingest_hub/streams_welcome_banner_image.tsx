/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import streamsWelcomeBannerLight from './assets/streams_welcome_banner_light.svg';
import streamsWelcomeBannerDark from './assets/streams_welcome_banner_dark.svg';

const ALT = i18n.translate('xpack.streams.streamDetailView.yourPreviewWillAppearHereImage', {
  defaultMessage: 'Your preview will appear here image for the streams app',
});

/**
 * Streams welcome banner illustration (data cylinder with checkmark).
 * Matches the AssetImage type="yourPreviewWillAppearHere" used in the Streams app welcome callout.
 */
export const StreamsWelcomeBannerImage: React.FC<{ size?: number }> = ({ size = 140 }) => {
  const { colorMode } = useEuiTheme();
  const src = colorMode === 'DARK' ? streamsWelcomeBannerDark : streamsWelcomeBannerLight;
  return <EuiImage src={src} alt={ALT} size={size} />;
};
