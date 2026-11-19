/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiContextMenuItem, EuiIcon } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import {
  MixedCreatePrototypeSettingsModalHost,
  openMixedCreatePrototypeSettingsModal,
} from './mixed_create_prototype_settings_modal';

const MENU_LABEL = i18n.translate(
  'xpack.observabilityAlerting.mixedCreate.prototypeSettingsUserMenu',
  { defaultMessage: 'Create rule prototype' }
);

/**
 * Registers avatar-menu entry + mounts the prototype settings modal host.
 * Returns an unmount callback for plugin stop.
 */
export const registerMixedCreatePrototypeSettingsUserMenu = ({
  coreStart,
  security,
}: {
  coreStart: CoreStart;
  security?: SecurityPluginStart;
}): (() => void) => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  ReactDOM.render(
    coreStart.rendering.addContext(<MixedCreatePrototypeSettingsModalHost />),
    container
  );

  security?.navControlService.addUserMenuLinks([
    {
      label: MENU_LABEL,
      iconType: 'controls',
      href: '',
      order: 900,
      dataTestSubj: 'mixedRulesPrototypeSettingsUserMenu',
      content: ({ closePopover }) => (
        <EuiContextMenuItem
          icon={<EuiIcon type="controls" size="m" aria-hidden={true} />}
          data-test-subj="mixedRulesPrototypeSettingsUserMenu"
          onClick={() => {
            closePopover();
            openMixedCreatePrototypeSettingsModal();
          }}
        >
          {MENU_LABEL}
        </EuiContextMenuItem>
      ),
    },
  ]);

  return () => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  };
};
