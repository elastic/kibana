/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCodeBlock } from '@elastic/eui';

interface CopyQueryProps {
  query: string;
  onCopied: () => void;
}

export const CopyQuery = React.memo<CopyQueryProps>(({ onCopied, query }) => {
  const onClick: React.MouseEventHandler = useCallback(
    (ev) => {
      // The only button inside the element is the "copy" button.
      if ((ev.target as Element).tagName === 'BUTTON') {
        onCopied();
      }
    },
    [onCopied]
  );

  return (
    <>
      {/* The click event is also dispatched when using the keyboard actions (space or enter) for "copy" button.
       * No need to use keyboard specific events, disabling the a11y lint rule:*/}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div onClick={onClick}>
        {/* onCopy react event is dispatched when the user copies text manually */}
        <EuiCodeBlock language="text" fontSize="m" paddingSize="m" isCopyable onCopy={onCopied}>
          {query}
        </EuiCodeBlock>
      </div>
    </>
  );
});
CopyQuery.displayName = 'CopyExportQuery';
