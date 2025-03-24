/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { EuiBadge, EuiToolTip, EuiText, copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';

interface ClickableBadgeProps {
  item: string;
  onClickAriaLabel?: string;
  onClick?: () => void;
  index: number;
}

export const ClickableBadge = ({ item, onClickAriaLabel, onClick, index }: ClickableBadgeProps) => {
  const [isTextCopied, setIsTextCopied] = useState(false);
  const copiedTextToolTipCleanupIdRef = useRef<ReturnType<typeof setTimeout>>();

  const onCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(item);

    if (copiedTextToolTipCleanupIdRef.current) {
      clearTimeout(copiedTextToolTipCleanupIdRef.current);
    }

    setIsTextCopied(true);
    copiedTextToolTipCleanupIdRef.current = setTimeout(() => setIsTextCopied(false), 2000);
  };

  return (
    <EuiToolTip
      content={
        isTextCopied
          ? i18n.translate('xpack.csp.itemCopied', { defaultMessage: 'Item copied' })
          : null
      }
    >
      <EuiBadge
        onClickAriaLabel={onClickAriaLabel}
        onClick={onClick || (() => {})}
        color="hollow"
        key={`${item}-${v4()}`}
        data-test-subj={`multi-value-copy-badge-${index}`}
        iconType="copy"
        iconOnClick={onCopyClick}
        iconOnClickAriaLabel={i18n.translate(
          'xpack.csp.vulnerabilities.latestVulnerabilitiesTable.copyToClipboard',
          {
            defaultMessage: 'Copy {item} to clipboard',
            values: { item },
          }
        )}
        iconSide="right"
      >
        <EuiText size="m">{item}</EuiText>
      </EuiBadge>
    </EuiToolTip>
  );
};
