/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { CellActionsRenderer } from '../../../../../common/components/cell_actions/cell_actions_renderer';
import { getEmptyStringTag } from '../../../../../common/components/empty_value';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry/events/flyout_v2/types';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { ENTITY_TYPE_BY_FIELD, getFlyoutPanelProps } from './helpers';
import { useEntityEuidFromAlerts } from './use_entity_euid_from_alerts';
import { useMarkdownFormatterContext } from '../context';
import { getAlertIdAriaLabel } from './translations';
import type { ParsedField } from '../types';

export const ALERTS_INDEX_PATTERN = `${DEFAULT_ALERTS_INDEX}-*` as const;

/** Alert-document `_id` fields whose values open the alert-details flyout when clicked. */
const ALERT_ID_FIELDS: ReadonlySet<string> = new Set(['_id', 'kibana.alert.uuid']);

const contextId = 'FieldMarkdownRenderer';

const inlineFieldWrapperCss = css`
  display: inline-flex;
  align-items: baseline;
  vertical-align: baseline;
`;

const boldValueCss = (color: string) => css`
  color: ${color};
  font-weight: bold;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
  }
`;

/** Constrains long values (UUIDs, hashes) to a readable width. */
const truncatedValueCss = (color: string) => css`
  ${boldValueCss(color)};
  display: inline-block;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: text-bottom;
  white-space: nowrap;
`;

const valueButtonCss = (color: string) => css`
  ${boldValueCss(color)};
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font: inherit;
  font-weight: bold;
  text-align: start;
`;

export const FieldMarkdownRenderer = ({ name, value }: ParsedField) => {
  const { disableActions, scopeId, alertIds } = useMarkdownFormatterContext();
  const { openFlyout, openRightPanel } = useExpandableFlyoutApi();
  const { openDocumentFlyoutFromPattern, openHostFlyout, openUserFlyout } = useFlyoutApi();
  const { euiTheme } = useEuiTheme();
  const enableNewFlyout = useIsNewFlyoutEnabled();

  // Detect whether the value is visually truncated so the full-value tooltip is only shown when
  // needed. This avoids a redundant tooltip for short values that already fit.
  // Re-run whenever `value` or `disableActions` changes: a different value changes the text width,
  // and a different `disableActions` switches the render path (attaching `fieldValueRef` to a
  // different DOM node), so the measurement needs to be refreshed in both cases.
  const fieldValueRef = useRef<HTMLSpanElement>(null);
  const [isValueTruncated, setIsValueTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = fieldValueRef.current;
    setIsValueTruncated(el != null && el.scrollWidth > el.clientWidth);
  }, [disableActions, name, value]);

  const stringValue = typeof value === 'string' ? value : undefined;

  // Build a Set for O(1) membership checks — alertIds may have O(100) entries and this component
  // renders once per field value in the markdown, so a linear `includes` scan adds up.
  const alertIdSet = useMemo(() => new Set(alertIds ?? []), [alertIds]);

  // Alert ids are clickable only when the value is a known alert id for this attack.
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

  const onEntityClick = useCallback(() => {
    if (flyoutPanelProps == null) return;

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
        <button
          css={valueButtonCss(euiTheme.colors.textParagraph)}
          data-test-subj="entityButton"
          disabled={isLoading}
          onClick={onEntityClick}
          type="button"
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
        </button>
      ) : null,
    [
      euiTheme.colors.textParagraph,
      euiTheme.size.xs,
      flyoutPanelProps,
      isLoading,
      onEntityClick,
      value,
    ]
  );

  if (disableActions) {
    return (
      <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
        <EuiToolTip
          content={isValueTruncated ? `${name}: ${value}` : name}
          data-test-subj="fieldMarkdownRendererToolTip"
          position="top"
        >
          <span
            ref={fieldValueRef}
            css={truncatedValueCss(euiTheme.colors.textParagraph)}
            data-test-subj="disabledActionsText"
            tabIndex={0}
          >
            {value === '' ? getEmptyStringTag() : value}
          </span>
        </EuiToolTip>
      </span>
    );
  }

  if (isClickableAlertId && stringValue != null) {
    return (
      <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
        <CellActionsRenderer
          scopeId={scopeId}
          field={name}
          tooltipContent={isValueTruncated ? `${name}: ${stringValue}` : undefined}
          value={value}
        >
          <button
            aria-label={getAlertIdAriaLabel(stringValue)}
            css={valueButtonCss(euiTheme.colors.textParagraph)}
            data-test-subj="alertIdButton"
            onClick={onAlertIdClick}
            type="button"
          >
            <span ref={fieldValueRef} css={truncatedValueCss(euiTheme.colors.textParagraph)}>
              {stringValue}
            </span>
          </button>
        </CellActionsRenderer>
      </span>
    );
  }

  return (
    <span css={inlineFieldWrapperCss} data-test-subj="fieldMarkdownRendererInlineWrapper">
      <CellActionsRenderer
        scopeId={scopeId}
        field={name}
        tooltipContent={
          // When entityButton is rendered, fieldValueRef is never attached (entity names are
          // shown untruncated), so isValueTruncated is always false for entity fields.
          // Guard explicitly so the intent is clear and the null/empty checks are not dead code.
          entityButton == null && isValueTruncated && value != null && value !== ''
            ? `${name}: ${value}`
            : undefined
        }
        value={value}
      >
        {/* Entity buttons render the full value; all other values are constrained to 10rem. */}
        {entityButton ??
          (value != null ? (
            <span
              ref={fieldValueRef}
              css={truncatedValueCss(euiTheme.colors.textParagraph)}
              data-test-subj="fieldMarkdownRendererValue"
            >
              {value === '' ? getEmptyStringTag() : value}
            </span>
          ) : undefined)}
      </CellActionsRenderer>
    </span>
  );
};
