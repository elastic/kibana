/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One draggable filter control, replicating the controls renderer's
 * `ControlPanel`: a `dragHorizontal` grab handle prepended inside the control
 * while editing, and a floating hover action bar pinned above the control's
 * top-right carrying Edit (pencil) and Remove (trash).
 *
 * Mirrors:
 *   src/platform/packages/private/kbn-controls-renderer/src/components/
 *     control_panel.tsx | drag_handle.tsx | floating_actions.tsx
 */

import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonIcon, EuiFilterGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const MOVE_CONTROL = (controlTitle: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.filterGroup.moveControl', {
    defaultMessage: 'Move control {controlTitle}',
    values: { controlTitle },
  });

const EDIT_CONTROL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.editControlConfiguration',
  { defaultMessage: 'Edit Options list configuration' }
);

const REMOVE_CONTROL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.removeControl',
  { defaultMessage: 'Remove' }
);

export interface SortableFilterControlProps {
  id: string;
  title: string;
  isEditable: boolean;
  /** Suppresses hover actions while the editor flyout is open, as Alerts does. */
  areHoverActionsHidden: boolean;
  onEdit: () => void;
  onRemove: () => void;
  /** Lets the group measure the control so the drag clone matches its width. */
  setControlRef: (id: string, ref: HTMLElement | null) => void;
  children: React.ReactNode;
}

export const SortableFilterControl: React.FC<SortableFilterControlProps> = ({
  id,
  title,
  isEditable,
  areHoverActionsHidden,
  onEdit,
  onRemove,
  setControlRef,
  children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const setRefs = useCallback(
    (ref: HTMLElement | null) => {
      setNodeRef(ref);
      setControlRef(id, ref);
    },
    [id, setNodeRef, setControlRef]
  );

  return (
    <EuiFlexItem
      component="li"
      ref={setRefs}
      style={{ transition, transform: CSS.Translate.toString(transform) }}
      grow={true}
      data-test-subj={`eaFaceliftControlFrame-${id}`}
      css={[styles.item, isDragging ? styles.draggingItem : null]}
    >
      <div css={styles.hoverWrapper}>
        <EuiFilterGroup compressed fullWidth css={isEditable ? styles.groupWithHandle : undefined}>
          {isEditable ? (
            <div
              {...attributes}
              {...listeners}
              aria-label={MOVE_CONTROL(title)}
              data-test-subj={`eaFaceliftControlDragHandle-${id}`}
              css={styles.dragHandle}
            >
              <EuiIcon type="dragHorizontal" aria-hidden={true} />
            </div>
          ) : null}
          {children}
        </EuiFilterGroup>

        {isEditable && !areHoverActionsHidden ? (
          <div
            className="eaFacelift__floatingActions"
            data-test-subj={`eaFaceliftControlHoverActions-${id}`}
            css={styles.floatingActions}
          >
            <EuiToolTip content={EDIT_CONTROL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="pencil"
                color="text"
                aria-label={EDIT_CONTROL}
                onClick={onEdit}
                data-test-subj={`eaFaceliftControlEdit-${id}`}
              />
            </EuiToolTip>
            <EuiToolTip content={REMOVE_CONTROL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="text"
                aria-label={REMOVE_CONTROL}
                onClick={onRemove}
                data-test-subj={`eaFaceliftControlRemove-${id}`}
              />
            </EuiToolTip>
          </div>
        ) : null}
      </div>
    </EuiFlexItem>
  );
};

const styles = {
  item: css({
    minInlineSize: 0,
  }),
  draggingItem: css({
    opacity: 0,
    visibility: 'hidden',
  }),
  hoverWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      '&:hover, &:focus-within': {
        '.eaFacelift__floatingActions': {
          opacity: 1,
          visibility: 'visible',
          transition: `visibility ${euiTheme.animation.fast}, opacity ${euiTheme.animation.fast}`,
        },
      },
    }),
  /**
   * EuiFilterGroup draws a 1px divider before each filter button to separate
   * adjacent filters. The grab handle isn't a filter, so that divider would
   * read as a line between the handle and the label.
   */
  groupWithHandle: css({
    '.euiFilterButton__wrapper::before': {
      display: 'none',
    },
  }),
  dragHandle: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      blockSize: '100%',
      cursor: 'grab',
      lineHeight: 0, // vertically centres the grab handle
      // EuiFilterGroup stretches non-button children to a 44px minimum via a
      // `> :not(.euiFilterButton)` rule, which outweighs this class
      flex: '0 0 auto !important',
      minInlineSize: 'unset !important',
      // Sits flush on the control's own background so it reads as part of the
      // label rather than a separate prepend segment
      paddingInlineStart: euiTheme.size.s,
      paddingInlineEnd: 0,
      '.euiIcon': {
        color: euiTheme.colors.textDisabled,
      },
      '&:hover > .euiIcon:first-of-type': {
        color: euiTheme.colors.textParagraph,
      },
    }),
  floatingActions: ({ euiTheme }: UseEuiTheme) =>
    css({
      opacity: 0,
      visibility: 'hidden',
      // slower on hover leave, in case the user accidentally stops hovering
      transition: `opacity ${euiTheme.animation.slow}`,
      position: 'absolute',
      right: euiTheme.size.xs,
      top: `-${euiTheme.size.l}`,
      zIndex: euiTheme.levels.toast,
      padding: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.medium,
      backgroundColor: euiTheme.colors.emptyShade,
      boxShadow: `0 0 0 1px ${euiTheme.colors.lightShade}`,
    }),
};
