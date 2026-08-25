/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';

import * as i18n from './translations';

interface IntervalAbbrScreenReaderProps {
  interval: string;
}

export const IntervalAbbrScreenReader = ({ interval }: IntervalAbbrScreenReaderProps) => {
  const screenReaderInterval: string | undefined = useMemo(() => {
    if (interval) {
      const number = parseInt(interval.slice(0, -1), 10);
      const unit = interval.charAt(interval.length - 1);

      if (Number.isFinite(number)) {
        switch (unit) {
          case 's': {
            return i18n.SECONDS_SCREEN_READER(number);
          }
          case 'm': {
            return i18n.MINUTES_SCREEN_READER(number);
          }
          case 'h': {
            return i18n.HOURS_SCREEN_READER(number);
          }
        }
      }
    }

    return undefined;
  }, [interval]);

  return (
    <>
      <span data-test-subj="interval-abbr-value" aria-hidden={Boolean(screenReaderInterval)}>
        {interval}
      </span>
      {screenReaderInterval && (
        <EuiScreenReaderOnly>
          <p>{screenReaderInterval}</p>
        </EuiScreenReaderOnly>
      )}
    </>
  );
};
