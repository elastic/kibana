/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';
import { useKibana } from '../hooks/use_kibana';

/**
 * Uses securityLayout service to retrieve shared plugin wrapper component and renders plugin routes / children inside of it.
 *
 * The `template` prop can be used to alter the page layout for a given plugin route / all routes within a plugin - depending on the nesting.
 */
export const SecuritySolutionPluginTemplateWrapper: FC<KibanaPageTemplateProps> = ({
  children,
  ...rest
}) => {
  const {
    services: {
      securityLayout: { getPluginWrapper },
    },
  } = useKibana();

  const Wrapper = getPluginWrapper();

  return <Wrapper {...rest}>{children}</Wrapper>;
};
