/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonEmpty, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import { DraggableBadge } from '../../../../../common/components/draggables';
import { getFlyoutPanelProps } from './helpers';
import type { ParsedField } from '../types';

const contextId = 'FieldMarkdownRenderer';

export const getFieldMarkdownRenderer = (disableActions: boolean, scopeId?: string) => {
  const FieldMarkdownRenderer = ({ icon, name, value }: ParsedField) => {
    const { openRightPanel } = useExpandableFlyoutApi();
    const { euiTheme } = useEuiTheme();

    const flyoutPanelProps = useMemo(
      () => getFlyoutPanelProps({ contextId, fieldName: name, value }),
      [name, value]
    );

    const onEntityClick = useCallback(() => {
      if (flyoutPanelProps != null) {
        openRightPanel(flyoutPanelProps);
      }
    }, [flyoutPanelProps, openRightPanel]);

    const entityButton: React.ReactElement | null = useMemo(
      () =>
        flyoutPanelProps != null ? (
          <EuiButtonEmpty
            css={css`
              font-size: ${euiTheme.font.scale.s}rem;
            `}
            data-test-subj="entityButton"
            flush="both"
            onClick={onEntityClick}
            size="xs"
          >
            {value}
          </EuiButtonEmpty>
        ) : null,

      [euiTheme.font.scale.s, flyoutPanelProps, onEntityClick, value]
    );

    return (
      <EuiToolTip content={name} data-test-subj="fieldMarkdownRendererToolTip" position="top">
        {disableActions ? (
          <EuiBadge color="hollow" data-test-subj="disabledActionsBadge" iconType={icon}>
            {value}
          </EuiBadge>
        ) : (
          <DraggableBadge
            contextId="fieldMarkdownRenderer"
            scopeId={scopeId}
            eventId=""
            iconType={icon}
            isAggregatable={false}
            field={name}
            value={value}
          >
            {entityButton}
          </DraggableBadge>
        )}
      </EuiToolTip>
    );
  };

  return FieldMarkdownRenderer;
};
