/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePermissions } from '../../../../hooks/use_permissions';

export function CreateCompositeSloBtn() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;

  const { data: permissions } = usePermissions();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleClickCreateCompositeSlo = () => {
    setIsPopoverOpen(false);
    navigateToUrl(basePath.prepend(paths.sloCompositeCreate));
  };

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="boxesVertical"
          aria-label={i18n.translate('xpack.slo.sloList.pageHeader.moreOptions', {
            defaultMessage: 'More options',
          })}
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          data-test-subj="slosPageMoreOptionsButton"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="createCompositeSlo"
            icon="aggregate"
            disabled={!permissions?.hasAllWriteRequested}
            onClick={handleClickCreateCompositeSlo}
            data-test-subj="slosPageCreateCompositeSloButton"
          >
            {i18n.translate('xpack.slo.sloList.pageHeader.createCompositeSlo', {
              defaultMessage: 'Create composite SLO',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
