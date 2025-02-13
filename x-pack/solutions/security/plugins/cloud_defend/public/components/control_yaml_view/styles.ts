/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { border } = euiTheme;

  return useMemo(() => {
    const yamlEditor: CSSObject = {
      height: '500px',
      border: border.thin,
    };

    // for some reason, switching back to monaco (by virtue of including the editor when yaml view selector, causes the editor not not update properly when switching views.
    // instead I just hide it visually, and show when we switch back which seems
    // to fix the issue.
    const hide: CSSObject = {
      visibility: 'hidden',
      position: 'absolute',
    };

    return { yamlEditor, hide };
  }, [border.thin]);
};
