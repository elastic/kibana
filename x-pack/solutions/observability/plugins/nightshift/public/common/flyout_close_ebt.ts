/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { getEbtProps } from '@kbn/ebt-click';
import { NIGHTSHIFT_EBT_ACTIONS } from './ebt_constants';

export const applyEbtPropsToElement = (
  element: HTMLElement,
  ebt: Parameters<typeof getEbtProps>[0]
): void => {
  const ebtProps = getEbtProps(ebt);
  Object.entries(ebtProps).forEach(([attribute, value]) => {
    if (value) {
      element.setAttribute(attribute, value);
    }
  });
};

/**
 * EuiFlyout does not forward closeButtonProps when flyoutMenuProps is present.
 * Annotate the menu's close button during capture, before Kibana's window-level
 * click listener reads the target attributes.
 */
export const setFlyoutMenuCloseButtonEbtProps = (clickEvent: MouseEvent, element: string): void => {
  if (!(clickEvent.target instanceof Element)) {
    return;
  }

  const closeButton = clickEvent.target.closest<HTMLElement>(
    '[data-test-subj="euiFlyoutCloseButton"]'
  );
  if (!closeButton) {
    return;
  }

  applyEbtPropsToElement(closeButton, {
    action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_FLYOUT,
    element,
  });
};
