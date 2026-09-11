/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonEmpty, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { getAlertIdChipAriaLabel } from './translations';
import type { ParsedField } from '../types';

export const ALERTS_INDEX_PATTERN = `${DEFAULT_ALERTS_INDEX}-*` as const;

/** Alert-document `_id` fields whose chips open the alert-details flyout when clicked. */
const ALERT_ID_FIELDS: ReadonlySet<string> = new Set(['_id', 'kibana.alert.uuid']);

const contextId = 'FieldMarkdownRenderer';

const inlineFieldWrapperCss = css`
  display: inline-block;
  vertical-align: middle;

  .euiBadge {
    vertical-align: middle;
  }
`;

/** Constrains long chip labels (UUIDs, hashes) to a readable width.
 *  10rem keeps the value theme-relative (scales with the root font size). */
const chipLabelCss = css`
  display: inline-block;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
`;

export const FieldMarkdownRenderer = ({ icon, name, value }: ParsedField) => {
  const { disableActions, scopeId, alertIds } = useMarkdownFormatterContext();
  const { openFlyout, openRightPanel } = useExpandableFlyoutApi();
  const { openDocumentFlyoutFromPattern, openHostFlyout, openUserFlyout } = useFlyoutApi();
  const { euiTheme } = useEuiTheme();
  const enableNewFlyout = useIsNewFlyoutEnabled();

  // Detect whether the chip label is visually truncated so the full-value tooltip is only shown
  // when needed — avoids a redundant tooltip for short values that already fit in the chip.
  // Re-run whenever `value` or `disableActions` changes: a different value changes the text width,
  // and a different `disableActions` switches the render path (attaching `chipLabelRef` to a
  // different DOM node), so the measurement needs to be refreshed in both cases.
  const chipLabelRef = useRef<HTMLSpanElement>(null);
  const [isValueTruncated, setIsValueTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = chipLabelRef.current;
    setIsValueTruncated(el != null && el.scrollWidth > el.clientWidth);
  }, [value, disableActions]);

  const stringValue = typeof value === 'string' ? value : undefined;

  // Build a Set for O(1) membership checks — alertIds may have O(100) entries and this component
  // renders once per chip in the markdown, so a linear `includes` scan adds up.
  const alertIdSet = useMemo(() => new Set(alertIds ?? []), [alertIds]);

  // Alert-id chips are clickable only when the value is a known alert id for this attack.
  const isClickableAlertId =
    ALERT_ID_FIELDS.has(name) &&
    !disableActions &&
    stringValue != null &&
    alertIdSet.has(stringValue);

  const onAlertIdClick = useCallback(() => {
    if (stringValue == null) return;
    if (enableNewFlyout) {
      openDocumentFlyoutFromPattern({
        documentId: stringValue,
        indexName: ALERTS_INDEX_PATTERN,
        origin: FLYOUT_ORIGIN.ATTACK_SUMMARY_ALERT,
      });
    } else {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: { id: stringValue, indexName: ALERTS_INDEX_PATTERN, scopeId },
        },
      });
    }
  }, [enableNewFlyout, openDocumentFlyoutFromPattern, openFlyout, scopeId, stringValue]);

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

  const onEntityClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent the click from bubbling up to parent interactive elements (e.g. accordion buttons).
      event.stopPropagation();

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
    },
    [
      flyoutPanelProps,
      openRightPanel,
      openHostFlyout,
      openUserFlyout,
      enableNewFlyout,
      name,
      value,
      euid,
      scopeId,
    ]
  );

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
        <EuiToolTip
          content={isValueTruncated ? `${name}: ${value}` : name}
          data-test-subj="fieldMarkdownRendererToolTip"
          position="top"
        >
          <EuiBadge
            color="hollow"
            data-test-subj="disabledActionsBadge"
            iconType={icon}
            tabIndex={0}
          >
            <span ref={chipLabelRef} css={chipLabelCss}>
              {value}
            </span>
          </EuiBadge>
        </EuiToolTip>
      </span>
    );
  }

  if (isClickableAlertId && stringValue != null) {
    return (
      <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
        <DraggableBadge
          contextId="fieldMarkdownRenderer"
          scopeId={scopeId}
          eventId=""
          iconType={icon}
          isAggregatable={false}
          field={name}
          tooltipContent={isValueTruncated ? `${name}: ${stringValue}` : undefined}
          value={value}
        >
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
            <span ref={chipLabelRef} css={chipLabelCss}>
              {stringValue}
            </span>
          </EuiButtonEmpty>
        </DraggableBadge>
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
        tooltipContent={
          // When entityButton is rendered, chipLabelRef is never attached (entity names are
          // shown untruncated), so isValueTruncated is always false for entity fields.
          // Guard explicitly so the intent is clear and the null/empty checks are not dead code.
          entityButton == null && isValueTruncated && value != null && value !== ''
            ? `${name}: ${value}`
            : undefined
        }
        value={value}
      >
        {/* Entity buttons (host/user) render the full value untruncated — entity names are short
            and meaningful context. For all other fields the label is constrained to chipLabelCss. */}
        {entityButton ??
          (value !== '' && value != null ? (
            <span ref={chipLabelRef} css={chipLabelCss}>
              {value}
            </span>
          ) : undefined)}
      </DraggableBadge>
    </span>
  );
};
