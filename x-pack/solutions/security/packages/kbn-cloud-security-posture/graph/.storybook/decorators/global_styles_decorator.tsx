/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { Global, css } from '@emotion/react';

const globalStyles = css`
  html,
  body,
  #storybook-root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
`;

export const GlobalStylesStorybookDecorator = (Story: ComponentType) => {
  return (
    <>
      <Global styles={globalStyles} />
      <Story />
    </>
  );
};
