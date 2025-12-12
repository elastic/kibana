/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon, type EuiIconProps } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import SiemMigrationsIconSVG from './siem_migrations.svg';
import SiemMigrationsIconDarkSVG from './siem_migrations_dark.svg';

export const SiemMigrationsIcon = React.memo<Omit<EuiIconProps, 'type'>>((props) => {
  const isDark = useKibanaIsDarkMode();
  if (isDark) {
    return <EuiIcon type={SiemMigrationsIconDarkSVG} {...props} />;
  }
  return <EuiIcon type={SiemMigrationsIconSVG} {...props} />;
});
SiemMigrationsIcon.displayName = 'SiemMigrationsIcon';
