/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuRunActionParams } from '@kbn/app-menu';
import type { HealthIntervalParameters } from '../../../../../common/api/detection_engine';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TECHNICAL_PREVIEW } from '../../../../common/components/technical_preview_badge/translations';
import { HealthIntervalFilter } from './health_interval_filter';
import * as i18n from './translations';

interface SpaceRulesHealthAppHeaderProps {
  interval?: HealthIntervalParameters;
  onIntervalChange: (interval: HealthIntervalParameters) => void;
  disabled: boolean;
}

export const SpaceRulesHealthAppHeader = React.memo<SpaceRulesHealthAppHeaderProps>(
  ({ interval, onIntervalChange, disabled }) => {
    const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
    const returnFocusRef = useRef<(() => void) | undefined>();
    const openFlyout = useCallback((params?: AppMenuRunActionParams) => {
      returnFocusRef.current = params?.returnFocus;
      setIsFlyoutOpen(true);
    }, []);
    const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

    useLayoutEffect(() => {
      if (isFlyoutOpen) {
        return;
      }

      const returnFocus = returnFocusRef.current;
      returnFocusRef.current = undefined;
      returnFocus?.();
    }, [isFlyoutOpen]);

    const menu = useMemo<AppHeaderMenu>(
      () => ({
        items: [
          {
            id: 'spaceRulesHealthInterval',
            label: i18n.TIME_RANGE,
            iconType: 'calendar',
            run: openFlyout,
            testId: 'spaceRulesHealthInterval',
          },
        ],
      }),
      [openFlyout]
    );

    return (
      <>
        <SecurityAppHeader
          title={i18n.SPACE_RULES_HEALTH_TITLE}
          badges={[{ label: TECHNICAL_PREVIEW, color: 'accent' }]}
          menu={menu}
          spacing="largeBleed"
        />
        {isFlyoutOpen && (
          <EuiFlyout
            aria-labelledby="spaceRulesHealthIntervalFlyoutTitle"
            closeButtonProps={{ 'aria-label': i18n.CLOSE_TIME_RANGE_SETTINGS }}
            data-test-subj="spaceRulesHealthIntervalFlyout"
            onClose={closeFlyout}
            size="s"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id="spaceRulesHealthIntervalFlyoutTitle">{i18n.TIME_RANGE_SETTINGS}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <HealthIntervalFilter
                value={interval}
                onChange={onIntervalChange}
                disabled={disabled}
              />
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </>
    );
  }
);

SpaceRulesHealthAppHeader.displayName = 'SpaceRulesHealthAppHeader';
