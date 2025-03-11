/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FrameInformationPanel } from './frame_information_panel';

export function EmptyFrame() {
  return (
    <FrameInformationPanel>
      <EuiText>
        {i18n.translate('xpack.profiling.frameInformationWindow.selectFrame', {
          defaultMessage: 'Click on a frame to display more information',
        })}
      </EuiText>
    </FrameInformationPanel>
  );
}
