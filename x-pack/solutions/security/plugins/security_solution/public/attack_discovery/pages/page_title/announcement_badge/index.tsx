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

export const IconAnnouncementBadge = React.memo<Omit<EuiIconProps, 'type'>>((props) => {
  const isDark = useKibanaIsDarkMode();
  if (isDark) {
    return <EuiIcon type={IconDarkSVG} {...props} />;
  }
  return <EuiIcon type={IconSVG} {...props} />;
});
IconAnnouncementBadge.displayName = 'IconAnnouncementBadge';
