/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

export function HideableReactQueryDevTools() {
  const [isHidden, setIsHidden] = useState(false);

  return !isHidden && process.env.NODE_ENV === 'development' ? (
    <div>
      <EuiToolTip
        content={i18n.translate(
          'xpack.observability.hideableReactQueryDevTools.euiButtonIcon.hideReactQueryLabel',
          { defaultMessage: 'Hide react query' }
        )}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          data-test-subj="o11yHideableReactQueryDevToolsButton"
          iconType="cross"
          color="primary"
          style={{ zIndex: 99999, position: 'fixed', bottom: '40px', left: '40px' }}
          onClick={() => setIsHidden(!isHidden)}
          aria-label={i18n.translate(
            'xpack.observability.hideableReactQueryDevTools.euiButtonIcon.hideReactQueryLabel',
            { defaultMessage: 'Hide react query' }
          )}
        />
      </EuiToolTip>
      <ReactQueryDevtools />
    </div>
  ) : null;
}
