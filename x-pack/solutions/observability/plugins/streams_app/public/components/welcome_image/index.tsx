/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, EuiImageProps, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useState } from 'react';

export function WelcomeImage(props: Omit<EuiImageProps, 'src' | 'url' | 'alt'>) {
  const { colorMode } = useEuiTheme();

  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    const dynamicImageImport =
      colorMode === 'LIGHT' ? import('./welcome_light.png') : import('./welcome_dark.png');

    dynamicImageImport.then((module) => setImageSrc(module.default));
  }, [colorMode]);

  return imageSrc ? <EuiImage size="l" {...props} alt={welcomeAlt} src={imageSrc} /> : null;
}

const welcomeAlt = i18n.translate('xpack.streams.streamDetailView.welcomeImage', {
  defaultMessage: 'Welcome image for working with streams',
});
