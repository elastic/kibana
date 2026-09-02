/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { MemoryRouter } from '@kbn/shared-ux-router';

interface WrapperProps {
  location: string;
}

export const Wrapper =
  (props: WrapperProps): React.FC<React.PropsWithChildren<{}>> =>
  ({ children }) => {
    return (
      <I18nProvider>
        <MemoryRouter initialEntries={[props.location]}>{children}</MemoryRouter>
      </I18nProvider>
    );
  };
