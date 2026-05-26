/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPopover, EuiIcon } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';

export const Popover = ({
  buttonAriaLabelText,
  children,
}: {
  buttonAriaLabelText?: string;
  children: React.ReactNode;
}) => {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  // Pointer + keyboard handlers wired explicitly because the trigger is a
  // `<span role="button">` rather than a `<button>` — see the comment on the
  // span below.
  const onActivate = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover();
    },
    [togglePopover]
  );
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onActivate(e);
      }
    },
    [onActivate]
  );

  return (
    <EuiPopover
      panelPaddingSize="s"
      button={
        // Using a `<span role="button">` instead of a real `<button>` so the
        // trigger can legally nest inside other interactive ancestors —
        // specifically the `<button>` that `EuiBasicTable` wraps around
        // sortable column header content. A `<button>` inside a `<button>`
        // is invalid HTML (React logs `validateDOMNesting` in dev) and
        // breaks keyboard focus order. Same pattern EUI itself uses for
        // popover triggers that may sit inside sortable cells.
        <span
          role="button"
          tabIndex={0}
          aria-label={
            buttonAriaLabelText
              ? i18n.translate('xpack.infra.hostsViewPage.popoverInfoIconButtonAriaLabelWithText', {
                  defaultMessage: '{buttonAriaLabelText} info button',
                  values: { buttonAriaLabelText },
                })
              : i18n.translate('xpack.infra.hostsViewPage.popoverInfoIconButtonAriaLabel', {
                  defaultMessage: 'info button',
                })
          }
          onClick={onActivate}
          onKeyDown={onKeyDown}
          data-test-subj="hostsViewTableColumnPopoverButton"
        >
          <EuiIcon type="question" aria-hidden={true} />
        </span>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      offset={10}
      anchorPosition="upCenter"
      panelStyle={{ maxWidth: 350 }}
    >
      {children}
    </EuiPopover>
  );
};
