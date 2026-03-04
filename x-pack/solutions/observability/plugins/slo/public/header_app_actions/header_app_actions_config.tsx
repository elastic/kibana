/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

export interface SloHeaderAppActionsConfigDeps {
  onAnnotations: () => void;
  onDocs: () => void;
  onManage: () => void;
  onSettings: () => void;
  onCreateSlo: () => void;
}

/**
 * Header app actions config for the SLOs app: secondary New button + overflow (Annotations, Docs, Manage, Settings).
 */
export function getSloHeaderAppActionsConfig(
  deps: SloHeaderAppActionsConfigDeps
): ChromeHeaderAppActionsConfig {
  const { onAnnotations, onDocs, onManage, onSettings, onCreateSlo } = deps;

  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.slo.headerAppActions.annotations', {
              defaultMessage: 'Annotations',
            }),
            icon: 'annotation',
            onClick: onAnnotations,
          },
          {
            name: i18n.translate('xpack.slo.headerAppActions.docs', {
              defaultMessage: 'Docs',
            }),
            icon: 'documentation',
            onClick: onDocs,
          },
          {
            name: i18n.translate('xpack.slo.headerAppActions.manage', {
              defaultMessage: 'Manage',
            }),
            icon: 'list',
            onClick: onManage,
          },
          {
            name: i18n.translate('xpack.slo.headerAppActions.settings', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: onSettings,
          },
        ],
      },
    ],
    secondaryActions: [
      <EuiButtonIcon
        key="slo-new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        onClick={onCreateSlo}
        data-test-subj="headerGlobalNav-appActionsNewSloButton"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.newAriaLabel', {
          defaultMessage: 'New',
        })}
      />,
    ],
  };
}
