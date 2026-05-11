/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import { i18n as kbnI18n } from '@kbn/i18n';

import { useKibana } from '../../lib/kibana/use_kibana';
import * as i18n from './translations';

export const EXIT_FULL_SCREEN_CLASS_NAME = 'exit-full-screen';

interface Props {
  fullScreen: boolean;
  setFullScreen: (fullScreen: boolean) => void;
}

const ExitFullScreenComponent: React.FC<Props> = ({ fullScreen, setFullScreen }) => {
  const {
    services: { hotkeys },
  } = useKibana();

  const exitFullScreen = useCallback(() => {
    setFullScreen(false);
  }, [setFullScreen]);

  useEffect(() => {
    if (!fullScreen) return;
    const handle = hotkeys.register(
      {
        id: 'securitySolution:exitFullScreen',
        keys: 'Escape',
        scope: 'context',
        label: kbnI18n.translate('xpack.securitySolution.exitFullScreen.shortcutLabel', {
          defaultMessage: 'Exit full screen',
        }),
      },
      (event) => {
        event.preventDefault();
        exitFullScreen();
      }
    );
    return handle.unregister;
  }, [hotkeys, fullScreen, exitFullScreen]);

  if (!fullScreen) {
    return null;
  }

  return (
    <>
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
