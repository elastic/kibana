/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiImageProps } from '@elastic/eui';
import { EuiImage, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useState } from 'react';

const imageSets = {
  ecs: {
    light: () => import('../../images/kubernetes_dashboards/ecs_light.svg'),
    dark: () => import('../../images/kubernetes_dashboards/ecs_dark.svg'),
    alt: i18n.translate('xpack.infra.kubernetesDashboardPromotion.ecsImageAlt', {
      defaultMessage: 'ECS Kubernetes Dashboard image',
    }),
  },
  semconv: {
    light: () => import('../../images/kubernetes_dashboards/semconv_light.svg'),
    dark: () => import('../../images/kubernetes_dashboards/semconv_dark.svg'),
    alt: i18n.translate('xpack.infra.kubernetesDashboardPromotion.semconvImageAlt', {
      defaultMessage: 'OpenTelemetry Kubernetes Dashboard image',
    }),
  },
};

interface AssetImageProps extends Omit<EuiImageProps, 'src' | 'url' | 'alt' | 'css'> {
  type?: 'ecs' | 'semconv';
}

export function KubernetesAssetImage({ type = 'ecs', ...props }: AssetImageProps) {
  const { colorMode } = useEuiTheme();
  const { alt, dark, light } = imageSets[type];

  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const dynamicImageImport = colorMode === 'LIGHT' ? light() : dark();

    dynamicImageImport.then((module) => {
      if (isMounted) {
        setImageSrc(module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [colorMode, dark, light]);

  return imageSrc ? <EuiImage size="s" alt={alt} src={imageSrc} {...props} /> : null;
}
