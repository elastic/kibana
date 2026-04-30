/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

const illustrationAlt = i18n.translate('xpack.observability.sigeventsOverview.illustrationAlt', {
  defaultMessage: 'Illustration for Significant Events discovery',
});

export function SignificantEventsDiscoveryIllustration() {
  const { colorMode } = useEuiTheme();
  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const dynamicImageImport =
      colorMode === 'LIGHT'
        ? import('../../assets/significant_events_discovery_light.svg')
        : import('../../assets/significant_events_discovery_dark.svg');

    dynamicImageImport.then((module) => {
      if (isMounted) {
        setImageSrc(module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [colorMode]);

  if (!imageSrc) {
    return null;
  }

  return <EuiImage src={imageSrc} alt={illustrationAlt} size="m" hasShadow={false} />;
}
