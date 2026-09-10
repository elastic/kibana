/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Simplified stand-in rendered in the drag overlay while a control is being
 * moved — title only, so the real control isn't rebuilt mid-drag.
 *
 * Mirrors src/platform/packages/private/kbn-controls-renderer/src/components/control_clone.tsx
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';

export const FilterControlClone: React.FC<{ title: string; width?: number }> = ({
  title,
  width,
}) => (
  <EuiFlexItem css={[styles.container, width ? css({ width: `${width}px` }) : undefined]}>
    <EuiFlexGroup responsive={false} gutterSize="none" css={styles.dragContainer}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="dragHorizontal" css={styles.grabIcon} aria-hidden={true} />
      </EuiFlexItem>
      {title.length ? (
        <EuiFlexItem>
          <label>{title}</label>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  </EuiFlexItem>
);

const styles = {
  container: css({
    width: 'max-content',
  }),
  grabIcon: css({ cursor: 'grabbing' }),
  dragContainer: (context: UseEuiTheme) =>
    css([
      {
        cursor: 'grabbing',
        height: context.euiTheme.size.xl,
        alignItems: 'center',
        paddingInline: context.euiTheme.size.xs,
        gap: context.euiTheme.size.xs,
        borderRadius: context.euiTheme.border.radius.medium,
        fontWeight: context.euiTheme.font.weight.bold,
        border: `${context.euiTheme.border.width.thin} solid ${context.euiTheme.colors.borderBasePlain}`,
        minWidth: `calc(${context.euiTheme.size.base} * 14)`,
        backgroundColor: context.euiTheme.colors.backgroundBaseFormsPrepend,
      },
      euiFontSize(context, 'xs'),
    ]),
};
