/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, MutableRefObject } from 'react';

import { css } from '@emotion/react';
import { useActions } from 'kea';

import { EuiButtonEmpty, EuiContextMenuPanel, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

import { PipelinesLogic } from '../pipelines_logic';

const revertContextMenuItemCSS = css`
  color: ${euiThemeVars.euiColorDanger};
`;

interface ManageCustomPipelineProps {
  buttonRef: MutableRefObject<HTMLButtonElement | null>;
}

export const ManageCustomPipelineActions: React.FC<ManageCustomPipelineProps> = ({ buttonRef }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openDeleteModal } = useActions(PipelinesLogic);

  const onButtonClick = () => setIsMenuOpen(!isMenuOpen);
  const onRevertClick = () => {
    openDeleteModal();
    setIsMenuOpen(false);
  };
  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          buttonRef={buttonRef}
          size="s"
          iconType="arrowDown"
          iconSide="right"
          onClick={onButtonClick}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.manageButton',
            { defaultMessage: 'Manage' }
          )}
        </EuiButtonEmpty>
      }
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem onClick={onRevertClick} icon="trash" css={revertContextMenuItemCSS}>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.ingestionPipeline.revertPipelineAction',
              { defaultMessage: 'Revert to default configuration' }
            )}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
