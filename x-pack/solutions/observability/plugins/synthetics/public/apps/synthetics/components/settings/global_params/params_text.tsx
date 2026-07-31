/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

export const ParamsText = ({ text }: { text: string }) => {
  const [isViewing, setIsViewing] = useState(false);

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            isViewing
              ? i18n.translate('xpack.synthetics.settingsRoute.hideParam', {
                  defaultMessage: 'Hide parameter value',
                })
              : i18n.translate('xpack.synthetics.settingsRoute.viewParam', {
                  defaultMessage: 'View parameter value',
                })
          }
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj="syntheticsParamsTextButton"
            iconType={!isViewing ? 'eye' : 'eyeSlash'}
            aria-label={
              isViewing
                ? i18n.translate('xpack.synthetics.settingsRoute.hideParam', {
                    defaultMessage: 'Hide parameter value',
                  })
                : i18n.translate('xpack.synthetics.settingsRoute.viewParam', {
                    defaultMessage: 'View parameter value',
                  })
            }
            aria-pressed={isViewing}
            onClick={() => setIsViewing((prevState) => !prevState)}
            disabled={!text}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText data-test-subj="syntheticsParamsText" size={isViewing ? 's' : 'm'}>
          {isViewing ? text : '•'.repeat(10)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
