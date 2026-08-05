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
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry/events/flyout_v2/types';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { ENTITY_TYPE_BY_FIELD, getFlyoutPanelProps } from './helpers';
import { useEntityEuidFromAlerts } from './use_entity_euid_from_alerts';
import { useMarkdownFormatterContext } from '../context';
import { FIELD_TOKEN_KIND, getFieldTokenKind, abbreviateFieldValue } from '../field_token_kind';
import { getIdChipTooltip, getAlertIdChipAriaLabel } from './translations';
import type { ParsedField } from '../types';

const contextId = 'FieldMarkdownRenderer';

const ALERTS_INDEX_PATTERN = `${DEFAULT_ALERTS_INDEX}-*` as const;

const inlineFieldWrapperCss = css`
  display: inline-block;
  vertical-align: middle;

  .euiBadge {
    vertical-align: middle;
  }
`;

export const FieldMarkdownRenderer = ({ icon, name, value }: ParsedField) => {
  const { disableActions, scopeId, alertIds } = useMarkdownFormatterContext();
  const { openRightPanel, openFlyout } = useExpandableFlyoutApi();
  const { openHostFlyout, openUserFlyout, openDocumentFlyoutFromPatternAsChild } = useFlyoutApi();
  const { euiTheme } = useEuiTheme();
  const enableNewFlyout = useIsNewFlyoutEnabled();

  // --- Compact id-chip classification ---
  const kind = useMemo(() => getFieldTokenKind(name, value), [name, value]);
  const isCompact = kind !== FIELD_TOKEN_KIND.DEFAULT;
  const stringValue = typeof value === 'string' ? value : undefined;
  const compactLabel =
    isCompact && stringValue != null ? abbreviateFieldValue(stringValue) : undefined;
  const idChipTooltip =
    isCompact && stringValue != null ? getIdChipTooltip(name, stringValue) : undefined;

  // Alert-id chips are clickable only when the value is a known alert id for this attack.
  const isClickableAlertId =
    kind === FIELD_TOKEN_KIND.ALERT_ID &&
    !disableActions &&
    stringValue != null &&
    (alertIds?.includes(stringValue) ?? false);

  const onAlertIdClick = useCallback(() => {
    if (stringValue == null) return;
    if (enableNewFlyout) {
      openDocumentFlyoutFromPatternAsChild({
        documentId: stringValue,
        indexName: ALERTS_INDEX_PATTERN,
        origin: FLYOUT_ORIGIN.ATTACK_SUMMARY_ALERT,
      });
    } else {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: stringValue,
            indexName: ALERTS_INDEX_PATTERN,
            scopeId,
          },
        },
      });
    }
  }, [enableNewFlyout, openDocumentFlyoutFromPatternAsChild, openFlyout, scopeId, stringValue]);

  // --- Entity-field classification (host/user — opens entity flyout) ---
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

  // --- Render: disabled-actions path ---
  if (disableActions) {
    const badgeLabel = isCompact && compactLabel != null ? compactLabel : value;
    const tooltipContent = isCompact && idChipTooltip != null ? idChipTooltip : name;
    return (
      <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
        <EuiToolTip
          content={tooltipContent}
          data-test-subj="fieldMarkdownRendererToolTip"
          position="top"
        >
          <EuiBadge
            color="hollow"
            data-test-subj="disabledActionsBadge"
            iconType={icon}
            tabIndex={0}
          >
            {badgeLabel}
          </EuiBadge>
        </EuiToolTip>
      </span>
    );
  }

  // --- Render: compact id-like chip (non-entity id fields, hashes, alert ids) ---
  if (isCompact && stringValue != null) {
    const alertIdButton = isClickableAlertId ? (
      <EuiButtonEmpty
        aria-label={getAlertIdChipAriaLabel(stringValue)}
        css={css`
          font-size: ${euiTheme.font.scale.s}rem;
        `}
        data-test-subj="alertIdButton"
        flush="both"
        onClick={onAlertIdClick}
        size="xs"
      >
        {compactLabel}
      </EuiButtonEmpty>
    ) : null;

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
          tooltipContent={idChipTooltip}
        >
          {alertIdButton ?? compactLabel}
        </DraggableBadge>
      </span>
    );
  }

  // --- Render: default (entity fields and everything else) ---
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
