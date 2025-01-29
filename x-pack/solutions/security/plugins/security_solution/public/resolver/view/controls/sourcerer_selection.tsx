/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover } from '@elastic/eui';
import { StyledEuiButtonIcon } from './styles';
import { useColors } from '../use_colors';
import { Sourcerer } from '../../../sourcerer/components';
import { SourcererScopeName } from '../../../sourcerer/store/model';

const nodeLegendButtonTitle = i18n.translate(
  'xpack.securitySolution.resolver.graphControls.sourcererButtonTitle',
  {
    defaultMessage: 'Data View Selection',
  }
);

export const SourcererButton = memo(
  ({
    id,
    closePopover,
    setActivePopover,
    isOpen,
  }: {
    id: string;
    closePopover: () => void;
    setActivePopover: (value: 'sourcererSelection') => void;
    isOpen: boolean;
  }) => {
    const setAsActivePopover = useCallback(
      () => setActivePopover('sourcererSelection'),
      [setActivePopover]
    );
    const colorMap = useColors();

    return (
      <EuiPopover
        button={
          <StyledEuiButtonIcon
            data-test-subj="resolver:graph-controls:sourcerer-button"
            size="m"
            title={nodeLegendButtonTitle}
            aria-label={nodeLegendButtonTitle}
            onClick={setAsActivePopover}
            iconType="indexSettings"
            $backgroundColor={colorMap.graphControlsBackground}
            $iconColor={colorMap.graphControls}
            $borderColor={colorMap.graphControlsBorderColor}
          />
        }
        isOpen={isOpen}
        closePopover={closePopover}
        anchorPosition="leftCenter"
      >
        <Sourcerer scope={SourcererScopeName.analyzer} />
      </EuiPopover>
    );
  }
);

SourcererButton.displayName = 'SourcererButton';
