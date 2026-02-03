/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon, type EuiIconProps } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import IconSVG from './icon.svg';
import IconDarkSVG from './icon_dark.svg';

export const IconSparkles = React.memo<Omit<EuiIconProps, 'type'>>((props) => {
  // TODO: we need to update dark mode icon, right now we use light mode icon in both cases
  const isDark = useKibanaIsDarkMode();
  const Icon = isDark ? IconDarkSVG : IconSVG;

  return <EuiIcon type={Icon} {...props} />;
});
IconSparkles.displayName = 'IconSparkles';
