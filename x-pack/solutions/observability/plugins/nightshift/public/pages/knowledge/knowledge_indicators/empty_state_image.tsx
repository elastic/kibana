/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiImageProps } from '@elastic/eui';
import { EuiImage, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';

const imageSet = {
  light: () => import('./assets/knowledge_indicators_empty_state_light.svg'),
  dark: () => import('./assets/knowledge_indicators_empty_state_dark.svg'),
  alt: i18n.translate('xpack.nightshift.knowledge.knowledgeIndicators.emptyStateImage', {
    defaultMessage: 'Empty state illustration for the Knowledge Indicators view',
  }),
};

export const KnowledgeIndicatorsEmptyStateImage = (
  props: Omit<EuiImageProps, 'src' | 'url' | 'alt'>
): React.ReactElement | null => {
  const { colorMode } = useEuiTheme();
  const [src, setSrc] = useState<string>();
  const isDark = colorMode === 'DARK';

  useEffect(() => {
    const loader = isDark ? imageSet.dark : imageSet.light;
    let cancelled = false;
    loader().then((module) => {
      if (!cancelled) setSrc(module.default);
    });
    return () => {
      cancelled = true;
    };
  }, [isDark]);

  const { size = 'm', ...rest } = props;
  return src ? <EuiImage size={size} src={src} alt={imageSet.alt} {...rest} /> : null;
};
