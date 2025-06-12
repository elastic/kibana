/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme as useEuiThemeHook } from '@elastic/eui';

// TODO: Borealis migration - euiLightVars and euiDarkVars are depricated.
// Options: lock <EuiThemeProvider colorMode="dark"> or use hardcoded colors outside of theme colors
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';

type EuiThemeProps = Parameters<typeof useEuiThemeHook>;
type ExtraEuiVars = {
  terminalOutputBackground: string;
  terminalOutputMarkerAccent: string;
  terminalOutputMarkerWarning: string;
  terminalOutputSliderBackground: string;
};
type EuiVars = ExtraEuiVars;
type EuiThemeReturn = ReturnType<typeof useEuiThemeHook> & { euiVars: EuiVars };

// Not all Eui Tokens were fully migrated to @elastic/eui/useEuiTheme yet, so
// this hook overrides the default useEuiTheme hook to provide a custom hook that
// allows the use the euiVars tokens from the euiLightVars and euiDarkVars
export const useEuiTheme = (...props: EuiThemeProps): EuiThemeReturn => {
  const euiThemeHook = useEuiThemeHook(...props);

  const euiVars = useMemo(() => {
    const extraEuiVars: ExtraEuiVars = {
      // Terminal Output Colors don't change with the theme
      terminalOutputBackground: '#1d1e23', // TODO: Borealis migration - replace with proper color token
      terminalOutputMarkerAccent: euiLightVars.euiColorAccent,
      terminalOutputMarkerWarning: euiDarkVars.euiColorWarning,
      terminalOutputSliderBackground: euiLightVars.euiColorDarkestShade,
    };

    return {
      ...extraEuiVars,
    };
  }, []);

  return {
    ...euiThemeHook,
    euiVars,
  };
};
