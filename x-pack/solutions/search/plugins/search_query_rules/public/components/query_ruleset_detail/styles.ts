/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { type EuiThemeComputed } from '@elastic/eui';

export const DocsColumnContainer = (theme: EuiThemeComputed<{}>) =>
  css({
    minWidth: theme.base * 10,
  });

export const ActionTypeIconBadgeContainer = (theme: EuiThemeComputed<{}>) =>
  css({
    minWidth: theme.base * 5,
    textAlign: 'end',
  });

export const DocumentCountLabelContainer = (theme: EuiThemeComputed<{}>) =>
  css({
    minWidth: theme.base * 4,
  });

export const DocumentCountLabelStyle = (theme: EuiThemeComputed<{}>) =>
  css({
    minWidth: theme.size.l,
  });

export const DraggableListHeader = (theme: EuiThemeComputed<{}>) =>
  css({
    padding: `0 ${theme.base * 2.25}px 0 ${theme.base * 1.5}px`,
  });

export const ActionHeaderContainer = (theme: EuiThemeComputed<{}>) =>
  css({
    minWidth: theme.size.xl,
    textAlign: 'end',
  });

export const DroppableContainer = (theme: EuiThemeComputed<{}>) =>
  css({
    backgroundColor: theme.colors.backgroundBaseSubdued,
  });

export const QueryRuleFlyoutBody = css({
  '.euiFlyoutBody__overflowContent': {
    height: '100%',
    padding: 0,
  },
});

export const QueryRuleFlyoutPanel = css({
  height: '100%',
});

export const QueryRuleFlyoutRightPanel = (theme: EuiThemeComputed<{}>) =>
  css({
    borderLeft: `1px solid ${theme.colors.lightShade}`,
  });
