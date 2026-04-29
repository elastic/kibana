/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { Global } from '@emotion/react';
import type { CommonProps } from '@elastic/eui';

import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { appGlobalStyles } from '../page';

const Wrapper = styled.div`
  &.securitySolutionWrapper--fullHeight {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
  }
  &.securitySolutionWrapper--noPadding {
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
  }
`;

Wrapper.displayName = 'Wrapper';

interface SecuritySolutionPageWrapperProps {
  children: React.ReactNode;
  style?: Record<string, string>;
  noPadding?: boolean;
  noTimeline?: boolean;
}

const SecuritySolutionPageWrapperComponent: React.FC<
  SecuritySolutionPageWrapperProps & CommonProps
> = ({ children, className, style, noPadding, noTimeline, ...otherProps }) => {
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  useEffect(() => {
    setGlobalFullScreen(false); // exit full screen mode on page load
  }, [setGlobalFullScreen]);

  const classes = classNames(className, {
    securitySolutionWrapper: true,
    'securitySolutionWrapper--noPadding': noPadding,
    'securitySolutionWrapper--withTimeline': !noTimeline,
    'securitySolutionWrapper--fullHeight': globalFullScreen,
  });

  return (
    <Wrapper className={classes} style={style} {...otherProps}>
      {children}
      <Global styles={appGlobalStyles} />
    </Wrapper>
  );
};

export const SecuritySolutionPageWrapper = React.memo(SecuritySolutionPageWrapperComponent);
