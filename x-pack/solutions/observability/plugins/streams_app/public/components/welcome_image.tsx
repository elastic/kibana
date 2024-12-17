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

export function WelcomeImage(props: Omit<EuiImageProps, 'src' | 'url'>) {
  const { colorMode } = useEuiTheme();

  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    const imagePath =
      colorMode === 'LIGHT' ? '../assets/welcome--light.png' : '../assets/welcome--dark.png';

    import(imagePath).then(setImageSrc);
  }, [colorMode]);

  return imageSrc ? <EuiImage alt={welcomeAlt} size="l" {...props} src={imageSrc} /> : null;
}

const welcomeAlt = i18n.translate('xpack.streams.streamDetailView.welcomeImage', {
  defaultMessage: 'Welcome image for working with streams',
});
