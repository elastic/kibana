/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type CompositeSloBurnRateWindow = '5m' | '1h' | '1d';

export function getCompositeSloBurnRateWindowAriaLabel(window: CompositeSloBurnRateWindow): string {
  switch (window) {
    case '5m':
      return i18n.translate('xpack.slo.compositeSloList.burnRate.timeWindowAria5m', {
        defaultMessage: '5 minutes',
      });
    case '1h':
      return i18n.translate('xpack.slo.compositeSloList.burnRate.timeWindowAria1h', {
        defaultMessage: '1 hour',
      });
    case '1d':
      return i18n.translate('xpack.slo.compositeSloList.burnRate.timeWindowAria1d', {
        defaultMessage: '1 day',
      });
  }
}

export interface CompositeSloBurnRateWindowColumnHeaderProps {
  burnRateWindow: CompositeSloBurnRateWindow;
  onBurnRateWindowChange: (window: CompositeSloBurnRateWindow) => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  buttonTestSubj: string;
  popoverAriaLabel: string;
  burnRateLabel: string;
}

export function CompositeSloBurnRateWindowColumnHeader({
  burnRateWindow,
  onBurnRateWindowChange,
  isPopoverOpen,
  setIsPopoverOpen,
  buttonTestSubj,
  popoverAriaLabel,
  burnRateLabel,
}: CompositeSloBurnRateWindowColumnHeaderProps) {
  return (
    <EuiPopover
      aria-label={popoverAriaLabel}
      button={
        <EuiButtonEmpty
          data-test-subj={buttonTestSubj}
          size="xs"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((open) => !open)}
          css={{ fontWeight: 700 }}
          aria-label={i18n.translate('xpack.slo.compositeSloList.burnRate.windowButtonAriaLabel', {
            defaultMessage: '{burnRateLabel} ({windowDescription})',
            values: {
              burnRateLabel,
              windowDescription: getCompositeSloBurnRateWindowAriaLabel(burnRateWindow),
            },
          })}
        >
          {burnRateLabel} ({burnRateWindow})
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={(['5m', '1h', '1d'] as const).map((itemWindow) => (
          <EuiContextMenuItem
            key={itemWindow}
            icon={burnRateWindow === itemWindow ? 'check' : 'empty'}
            aria-label={getCompositeSloBurnRateWindowAriaLabel(itemWindow)}
            onClick={() => {
              onBurnRateWindowChange(itemWindow);
              setIsPopoverOpen(false);
            }}
          >
            {itemWindow}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
}
