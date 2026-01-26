/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  euiDragDropReorder,
  useEuiTheme,
  type DragDropContextProps,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityFieldInfo } from '../../hooks/use_available_metrics';

interface GroupBySelectorProps {
  /** Currently selected group by fields (empty array for no grouping) */
  value: string[];
  /** Callback when group by changes */
  onChange: (fields: string[]) => void;
  /** Available fields for grouping */
  fields?: EntityFieldInfo[];
  /** Currently selected entity field (to exclude from options) */
  currentEntityField: string;
  /** Whether the selector is loading */
  isLoading?: boolean;
  /** Whether the selector is disabled */
  isDisabled?: boolean;
}

/** Maximum number of group by fields allowed */
const MAX_GROUP_BY_FIELDS = 5;

export const GroupBySelector: React.FC<GroupBySelectorProps> = ({
  value,
  onChange,
  fields = [],
  currentEntityField,
  isLoading = false,
  isDisabled = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Available options (excluding current entity and already selected)
  const availableOptions = useMemo(() => {
    return fields
      .filter((field) => field.name !== currentEntityField && !value.includes(field.name))
      .map((field) => ({
        name: field.name,
        isTimeSeriesDimension: field.isTimeSeriesDimension,
      }));
  }, [fields, currentEntityField, value]);

  const isAtMaxLimit = value.length >= MAX_GROUP_BY_FIELDS;

  const handleAddField = useCallback(
    (fieldName: string) => {
      if (!isAtMaxLimit && !value.includes(fieldName)) {
        onChange([...value, fieldName]);
      }
      setIsPopoverOpen(false);
    },
    [value, onChange, isAtMaxLimit]
  );

  const handleRemoveField = useCallback(
    (fieldName: string) => {
      onChange(value.filter((f) => f !== fieldName));
    },
    [value, onChange]
  );

  const handleDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const reordered = euiDragDropReorder(value, source.index, destination.index);
        onChange(reordered);
      }
    },
    [value, onChange]
  );

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Build selectable options
  const selectableOptions: EuiSelectableOption[] = availableOptions.map((opt) => ({
    label: opt.name,
    key: opt.name,
    append: opt.isTimeSeriesDimension ? (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.infra.esqlInventory.groupBySelector.tsdsBadge', {
          defaultMessage: 'TSDS',
        })}
      </EuiBadge>
    ) : undefined,
  }));

  const handleSelectableChange = (options: EuiSelectableOption[]) => {
    const selected = options.find((opt) => opt.checked === 'on');
    if (selected) {
      handleAddField(selected.label);
    }
  };

  const tooltipContent = isDisabled
    ? i18n.translate('xpack.infra.esqlInventory.groupBySelector.disabledTooltip', {
        defaultMessage: 'Select an entity and metric to enable grouping',
      })
    : value.length > 1
    ? i18n.translate('xpack.infra.esqlInventory.groupBySelector.reorderTooltip', {
        defaultMessage: 'Drag to reorder hierarchy. First field = top level grouping.',
      })
    : i18n.translate('xpack.infra.esqlInventory.groupBySelector.multiTooltip', {
        defaultMessage: 'Group results by up to {max} fields',
        values: { max: MAX_GROUP_BY_FIELDS },
      });

  const addButton = (
    <EuiButtonEmpty
      data-test-subj="esqlInventoryGroupBySelectorAddButton"
      size="xs"
      iconType="plusInCircle"
      onClick={() => setIsPopoverOpen(true)}
      isDisabled={isDisabled || isAtMaxLimit || availableOptions.length === 0}
      isLoading={isLoading}
      css={css`
        .euiButtonEmpty__text {
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
        }
      `}
    >
      {value.length === 0
        ? i18n.translate('xpack.infra.esqlInventory.groupBySelector.addLabel', {
            defaultMessage: 'Add grouping',
          })
        : i18n.translate('xpack.infra.esqlInventory.groupBySelector.addMoreLabel', {
            defaultMessage: 'Add',
          })}
    </EuiButtonEmpty>
  );

  return (
    <EuiToolTip content={tooltipContent} position="top">
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        wrap
        data-test-subj="esqlInventoryGroupBySelector"
      >
        {/* Label */}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.infra.esqlInventory.groupBySelector.label', {
              defaultMessage: 'Group by:',
            })}
          </EuiText>
        </EuiFlexItem>

        {/* Selected fields - draggable */}
        {value.length > 0 && (
          <EuiDragDropContext onDragEnd={handleDragEnd}>
            <EuiDroppable
              droppableId="groupByFields"
              direction="horizontal"
              css={css`
                display: flex;
                gap: ${euiTheme.size.xs};
                flex-wrap: wrap;
              `}
            >
              {value.map((fieldName, idx) => (
                <EuiDraggable
                  key={fieldName}
                  index={idx}
                  draggableId={fieldName}
                  customDragHandle
                  hasInteractiveChildren
                  css={css`
                    flex-shrink: 0;
                  `}
                >
                  {(provided) => (
                    <EuiBadge
                      color="hollow"
                      iconType="cross"
                      iconSide="right"
                      iconOnClick={() => handleRemoveField(fieldName)}
                      iconOnClickAriaLabel={i18n.translate(
                        'xpack.infra.esqlInventory.groupBySelector.removeAriaLabel',
                        { defaultMessage: 'Remove {field}', values: { field: fieldName } }
                      )}
                      css={css`
                        cursor: grab;
                        max-width: 180px;
                        &:active {
                          cursor: grabbing;
                        }
                        .euiBadge__text {
                          overflow: hidden;
                          text-overflow: ellipsis;
                        }
                      `}
                    >
                      <span {...provided.dragHandleProps}>
                        <EuiFlexGroup
                          gutterSize="xs"
                          alignItems="center"
                          responsive={false}
                          css={css`
                            display: inline-flex;
                          `}
                        >
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="grab" size="s" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <span
                              css={css`
                                max-width: 120px;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                              `}
                              title={fieldName}
                            >
                              {fieldName}
                            </span>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </span>
                    </EuiBadge>
                  )}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
        )}

        {/* Add button with popover */}
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={addButton}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiSelectable
              searchable
              searchProps={{
                placeholder: i18n.translate(
                  'xpack.infra.esqlInventory.groupBySelector.searchPlaceholder',
                  { defaultMessage: 'Search fields...' }
                ),
                compressed: true,
              }}
              options={selectableOptions}
              onChange={handleSelectableChange}
              singleSelection
              listProps={{
                showIcons: false,
              }}
              height={240}
              css={css`
                width: 280px;
              `}
            >
              {(list, search) => (
                <>
                  <div
                    css={css`
                      padding: ${euiTheme.size.s};
                      border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
                    `}
                  >
                    {search}
                  </div>
                  {selectableOptions.length > 0 ? (
                    list
                  ) : (
                    <EuiText
                      size="s"
                      color="subdued"
                      css={css`
                        padding: ${euiTheme.size.m};
                        text-align: center;
                      `}
                    >
                      {i18n.translate(
                        'xpack.infra.esqlInventory.groupBySelector.noFieldsAvailable',
                        {
                          defaultMessage: 'No fields available',
                        }
                      )}
                    </EuiText>
                  )}
                </>
              )}
            </EuiSelectable>
          </EuiPopover>
        </EuiFlexItem>

        {/* Clear all button */}
        {value.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="esqlInventoryGroupBySelectorClearButton"
              size="xs"
              iconType="cross"
              onClick={handleClearAll}
              aria-label={i18n.translate(
                'xpack.infra.esqlInventory.groupBySelector.clearAllAriaLabel',
                { defaultMessage: 'Clear all group by fields' }
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
