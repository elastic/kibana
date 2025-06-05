import React from "react";
import { useDarkMode } from "@kbn/kibana-react-plugin/public";
import { EuiThemeProvider as KibanaEuiThemeProvider } from '@kbn/kibana-react-plugin/common';

export const EuiThemeProvider = ({ children}: { children: React.ReactNode }) => {
    const darkMode = useDarkMode();

  return (
    <KibanaEuiThemeProvider darkMode={darkMode}>
      {children}
    </KibanaEuiThemeProvider>
  );
};
    