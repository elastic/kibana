/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonEmpty, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DraggableBadge } from '../../../../../common/components/draggables';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { ENTITY_TYPE_BY_FIELD, getFlyoutPanelProps } from './helpers';
import { useEntityEuidFromAlerts } from './use_entity_euid_from_alerts';
import { useMarkdownFormatterContext } from '../context';
import type { ParsedField } from '../types';

const contextId = 'FieldMarkdownRenderer';

const inlineFieldWrapperCss = css`
  display: inline-block;
  vertical-align: middle;

  .euiBadge {
    vertical-align: middle;
  }
`;

export const FieldMarkdownRenderer = ({ icon, name, value }: ParsedField) => {
  const { disableActions, scopeId, alertIds } = useMarkdownFormatterContext();
  const { openRightPanel } = useExpandableFlyoutApi();
  const { openHostFlyout, openUserFlyout } = useFlyoutApi();
  const { euiTheme } = useEuiTheme();
  const enableNewFlyout = useIsNewFlyoutEnabled();

  const isEntityField = name in ENTITY_TYPE_BY_FIELD && typeof value === 'string';

  const { euid, isLoading } = useEntityEuidFromAlerts({
    alertIds: alertIds ?? [],
    fieldName: name,
    fieldValue: typeof value === 'string' ? value : '',
    enabled: !disableActions && isEntityField,
  });

  const flyoutPanelProps = useMemo(
    () => getFlyoutPanelProps({ contextId, fieldName: name, value, entityId: euid, scopeId }),
    [euid, name, value, scopeId]
  );

  const onEntityClick = useCallback(() => {
    if (flyoutPanelProps == null) {
      return;
    }

    if (enableNewFlyout) {
      if (ENTITY_TYPE_BY_FIELD[name] === 'host') {
        openHostFlyout({ hostName: value as string, entityId: euid, scopeId });
      } else {
        openUserFlyout({ userName: value as string, entityId: euid, scopeId });
      }
    } else {
      openRightPanel(flyoutPanelProps);
    }
  }, [
    flyoutPanelProps,
    openRightPanel,
    openHostFlyout,
    openUserFlyout,
    enableNewFlyout,
    name,
    value,
    euid,
    scopeId,
  ]);

  const entityButton: React.ReactElement | null = useMemo(
    () =>
      flyoutPanelProps != null ? (
        <EuiButtonEmpty
          css={css`
            font-size: ${euiTheme.font.scale.s}rem;
          `}
          data-test-subj="entityButton"
          flush="both"
          isDisabled={isLoading}
          onClick={onEntityClick}
          size="xs"
        >
          {value}
          {isLoading && (
            <EuiLoadingSpinner
              size="s"
              css={css`
                margin-left: ${euiTheme.size.xs};
              `}
            />
          )}
        </EuiButtonEmpty>
      ) : null,

    [euiTheme.font.scale.s, euiTheme.size.xs, flyoutPanelProps, isLoading, onEntityClick, value]
  );

  if (disableActions) {
    return (
      <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
        <EuiToolTip content={name} data-test-subj="fieldMarkdownRendererToolTip" position="top">
          <EuiBadge color="hollow" data-test-subj="disabledActionsBadge" iconType={icon}>
            {value}
          </EuiBadge>
        </EuiToolTip>
      </span>
    );
  }

  return (
    <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
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
    </span>
  );
};
