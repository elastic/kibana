/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiWindowEvent } from '@elastic/eui';
import React, { useCallback } from 'react';

import * as i18n from './translations';

export const EXIT_FULL_SCREEN_CLASS_NAME = 'exit-full-screen';

interface Props {
  fullScreen: boolean;
  setFullScreen: (fullScreen: boolean) => void;
}

const ExitFullScreenComponent: React.FC<Props> = ({ fullScreen, setFullScreen }) => {
  const exitFullScreen = useCallback(() => {
    setFullScreen(false);
  }, [setFullScreen]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        exitFullScreen();
      }
    },
    [exitFullScreen]
  );

  if (!fullScreen) {
    return null;
  }

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiButton
        className={EXIT_FULL_SCREEN_CLASS_NAME}
        data-test-subj="exit-full-screen"
        fullWidth={false}
        iconType="fullScreen"
        fill
        isDisabled={!fullScreen}
        onClick={exitFullScreen}
      >
        {i18n.EXIT_FULL_SCREEN}
      </EuiButton>
    </>
  );
};

ExitFullScreenComponent.displayName = 'ExitFullScreenComponent';

export const ExitFullScreen = React.memo(ExitFullScreenComponent);
