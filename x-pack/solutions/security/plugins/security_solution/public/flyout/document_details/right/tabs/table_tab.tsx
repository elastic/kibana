/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { getOr, sortBy } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { css } from '@emotion/react';
import {
  // EuiButton,
  // EuiPopoverFooter,
  EuiSpacer,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPopover,
  EuiPopoverTitle,
  EuiRadio,
  EuiSwitch,
  EuiText,
  type EuiBasicTableColumn,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dataTableSelectors, tableDefaults } from '@kbn/securitysolution-data-table';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';
import { TableFieldNameCell } from '../components/table_field_name_cell';
import { TableFieldValueCell } from '../components/table_field_value_cell';
import { TABLE_TAB_CONTENT_TEST_ID, TABLE_TAB_SEARCH_INPUT_TEST_ID } from './test_ids';
import { getAllFieldsByName } from '../../../../common/containers/source';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineDefaults } from '../../../../timelines/store/defaults';
import { timelineSelectors } from '../../../../timelines/store';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import { CellActions } from '../../shared/components/cell_actions';
import { useDocumentDetailsContext } from '../../shared/context';
import { isInTableScope, isTimelineScope } from '../../../../helpers';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
// import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
// import { EditHighlighedFieldsButton } from '../components/highlighed_fields_button';

interface ItemsEntry {
  pinnedRows: TimelineEventsDetailsItem[];
  hfRows: TimelineEventsDetailsItem[];
  restRows: TimelineEventsDetailsItem[];
  defaultRows: TimelineEventsDetailsItem[];
}

const COUNT_PER_PAGE_OPTIONS = [25, 50, 100];

const PLACEHOLDER = i18n.translate('xpack.securitySolution.flyout.table.filterPlaceholderLabel', {
  defaultMessage: 'Filter by field or value...',
});
export const FIELD = i18n.translate('xpack.securitySolution.flyout.table.fieldCellLabel', {
  defaultMessage: 'Field',
});
const VALUE = i18n.translate('xpack.securitySolution.flyout.table.valueCellLabel', {
  defaultMessage: 'Value',
});

/**
 * Defines the behavior of the search input that appears above the table of data
 */
const search = {
  box: {
    incremental: true,
    placeholder: PLACEHOLDER,
    schema: true,
    'data-test-subj': TABLE_TAB_SEARCH_INPUT_TEST_ID,
  },
};

/**
 * Retrieve the correct field from the BrowserField
 */
export const getFieldFromBrowserField = memoizeOne(
  (field: string, browserFields: BrowserFields): FieldSpec | undefined => {
    const category = getCategory(field);

    return browserFields[category]?.fields?.[field] as FieldSpec;
  },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export type ColumnsProvider = (providerOptions: {
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Whether the preview link is in preview mode
   */
  isPreview: boolean;
  /**
   * Value of the link field if it exists. Allows to navigate to other pages like host, user, network...
   */
  getLinkValue: (field: string) => string | null;
  /**
   * Function to toggle pinned fields
   */
  onTogglePinned: (field: string) => void;
  /**
   * Array of pinned fields
   */
  pinnedFields: string[];
}) => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

export const getColumns: ColumnsProvider = ({
  browserFields,
  eventId,
  getLinkValue,
  isPreview,
  onTogglePinned,
  ruleId,
  scopeId,
}) => [
  // {
  //   actions: [
  //     {
  //       name: ' ',
  //       type: 'icon',
  //       iconType: 'pin',
  //       color: 'text',
  //       onClick: (data: TimelineEventsDetailsItem) => {
  //         onTogglePinned(data.field);
  //       },
  //       showOnHover: true,
  //     },
  //   ],
  // },
  // {
  //   name: ' ',
  //   field: 'isPinned',
  //   render: (isPinned: boolean, data: TimelineEventsDetailsItem) => {
  //     return (
  //       <EuiButtonIcon
  //         data-test-subj={`unifiedDocViewer_pinControlButton_${data.field}`}
  //         iconSize="m"
  //         iconType={isPinned ? 'pinFilled' : 'pin'}
  //         color="text"
  //         // aria-label={label}
  //         onClick={() => {
  //           onTogglePinned(data.field);
  //         }}
  //         // css={css`
  //         //   opacity: ${isPinned ? 1 : 0};
  //         //   &:hover {
  //         //     opacity: 1;
  //         //   }
  //         // `}
  //       />
  //     );
  //   },
  //   width: '6%',
  // },
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>{FIELD}</strong>
      </EuiText>
    ),
    width: '27%',
    render: (field, data) => {
      return <TableFieldNameCell dataType={(data as EventFieldsData).type} field={field} />;
    },
  },
  {
    field: 'values',
    name: (
      <EuiText size="xs">
        <strong>{VALUE}</strong>
      </EuiText>
    ),
    width: '67%',
    render: (values, data) => {
      const fieldFromBrowserField = getFieldFromBrowserField(data.field, browserFields);
      return (
        <CellActions field={data.field} value={values} isObjectArray={data.isObjectArray}>
          <TableFieldValueCell
            scopeId={scopeId}
            data={data as EventFieldsData}
            eventId={eventId}
            fieldFromBrowserField={fieldFromBrowserField}
            getLinkValue={getLinkValue}
            ruleId={ruleId}
            isPreview={isPreview}
            values={values}
          />
        </CellActions>
      );
    },
  },
];

// const updatePinnedFieldsState = (newFields: string[], dataViewId: string, storage: Storage) => {
//   let pinnedFieldsEntry = storage.get(PINNED_FIELDS_KEY);
//   pinnedFieldsEntry =
//     typeof pinnedFieldsEntry === 'object' && pinnedFieldsEntry !== null ? pinnedFieldsEntry : {};

//   storage.set(PINNED_FIELDS_KEY, {
//     ...pinnedFieldsEntry,
//     [dataViewId]: newFields,
//   });
// };
// const pinAllFields = useCallback(() => {
//   setIsPinAllFields(!isPinAllFields);
//   setPinnedFields([...pinnedFields, ...highlightedFields]);
// }, [highlightedFields, pinnedFields, isPinAllFields]);

const TestRadioGroup = ({
  radio1Selected,
  radio2Selected,
  radio3Selected,
  onRadio1Change,
  onRadio2Change,
  onRadio3Change,
}: {
  radio1Selected: boolean;
  radio2Selected: boolean;
  radio3Selected: boolean;
  onRadio1Change: () => void;
  onRadio2Change: () => void;
  onRadio3Change: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      css={css`
        background-color: ${euiTheme.colors.backgroundLightText};
      `}
    >
      <EuiFlexItem>
        <EuiRadio id="toggle" checked={radio1Selected} onChange={onRadio1Change} label="Toggle" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiRadio id="sort" checked={radio2Selected} onChange={onRadio2Change} label="Sort" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiRadio id="filter" checked={radio3Selected} onChange={onRadio3Change} label="Filter" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Table view displayed in the document details expandable flyout right section Table tab
 */
export const TableTab = memo(() => {
  const smallFontSize = useEuiFontSize('xs').fontSize;
  const { euiTheme } = useEuiTheme();
  const {
    browserFields,
    dataFormattedForFieldBrowser,
    scopeId,
    isPreview,
    eventId,
    investigationFields,
  } = useDocumentDetailsContext();
  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showHighlightedFieldsOnTop, setShowHighlightedFieldsOnTop] = useState(false); // should fetch from local storage
  const [pinnedFields, setPinnedFields] = useState<string[]>([]);
  // const [isPinAllFields, setIsPinAllFields] = useState(false);
  const [showPinnedFieldsOnTop, setShowPinnedFieldsOnTop] = useState(false);
  const [hideEmptyFields, setHideEmptyFields] = useState(false);

  // //// testing
  const [radio1Selected, setRadio1Selected] = useState(true);
  const [radio2Selected, setRadio2Selected] = useState(false);
  const [radio3Selected, setRadio3Selected] = useState(false);

  const onRadio1Change = () => {
    setRadio1Selected(true);
    setRadio2Selected(false);
    setRadio3Selected(false);
  };
  const onRadio2Change = () => {
    setRadio1Selected(false);
    setRadio2Selected(true);
    setRadio3Selected(false);
  };
  const onRadio3Change = () => {
    setRadio1Selected(false);
    setRadio2Selected(false);
    setRadio3Selected(true);
  };

  const highlightedFields = Object.keys(
    useHighlightedFields({
      dataFormattedForFieldBrowser,
      investigationFields,
    })
  );
  const onToggleHighlightedFieldsOnTop = useCallback(() => {
    setShowHighlightedFieldsOnTop(!showHighlightedFieldsOnTop);
    if (radio2Selected) {
      setShowPinnedFieldsOnTop(false);
    }
  }, [showHighlightedFieldsOnTop, radio2Selected, setShowPinnedFieldsOnTop]);

  const onTogglePinnedFields = useCallback(() => {
    setShowPinnedFieldsOnTop(!showPinnedFieldsOnTop);
    if (radio2Selected) {
      setShowHighlightedFieldsOnTop(false);
    }
  }, [showPinnedFieldsOnTop, radio2Selected, setShowHighlightedFieldsOnTop]);

  const renderToolsRight = useCallback(() => {
    if (radio1Selected) {
      return [
        <EuiPopover
          button={
            <EuiButtonIcon
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              iconType="gear"
              size="m"
              css={css`
                border: 1px solid ${euiTheme.colors.backgroundLightText};
                margin-left: -5px;
              `}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          display="block"
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" direction="column">
            <EuiFlexItem>
              <EuiSwitch
                label="Show highlighted fields on top"
                checked={showHighlightedFieldsOnTop}
                onChange={onToggleHighlightedFieldsOnTop}
                compressed
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                label="Hide empty fields"
                checked={hideEmptyFields}
                onChange={() => setHideEmptyFields(!hideEmptyFields)}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopover>,
      ];
    }
    return [
      <EuiPopover
        button={
          <EuiButtonIcon
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            iconType="filter"
            size="m"
            css={css`
              border: 1px solid ${euiTheme.colors.backgroundLightText};
              margin-left: -5px;
            `}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        display="block"
      >
        <EuiPopoverTitle>{radio2Selected ? 'Sort by' : 'Filter by'}</EuiPopoverTitle>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" direction="column">
          <EuiFlexItem>
            <EuiSwitch
              label="Highlighted fields"
              checked={showHighlightedFieldsOnTop}
              onChange={onToggleHighlightedFieldsOnTop}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSwitch
              label="Pin"
              checked={showPinnedFieldsOnTop}
              onChange={onTogglePinnedFields}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>,
    ];
  }, [
    isPopoverOpen,
    showHighlightedFieldsOnTop,
    showPinnedFieldsOnTop,
    radio1Selected,
    radio2Selected,
    hideEmptyFields,
    euiTheme.colors.backgroundLightText,
    onToggleHighlightedFieldsOnTop,
    onTogglePinnedFields,
    // isRuleLoading,
    // maybeRule,
    // ruleId,
    // isPinAllFields,
  ]);

  // ///// testing

  const [pagination, setPagination] = useState<{ pageIndex: number }>({
    pageIndex: 0,
  });
  const onTableChange = useCallback(({ page: { index } }: { page: { index: number } }) => {
    setPagination({ pageIndex: index });
  }, []);

  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);

  const defaults = useMemo(
    () => (isTimelineScope(scopeId) ? timelineDefaults : tableDefaults),
    [scopeId]
  );

  const columnHeaders = useDeepEqualSelector((state) => {
    const { columns } = (getScope && getScope(state, scopeId)) ?? defaults;
    return columns;
  });

  const fieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);

  const onTogglePinned = useCallback(
    (field: string) => {
      const newPinned = pinnedFields.includes(field)
        ? pinnedFields.filter((curField) => curField !== field)
        : [...pinnedFields, field];

      // updatePinnedFieldsState(newPinned, currentDataViewId, storage);
      setPinnedFields(newPinned);
    },
    [pinnedFields]
  );

  const items = useMemo(() => {
    const sortedFields = sortBy(['field'], dataFormattedForFieldBrowser).map((item, i) => ({
      ...item,
      ...fieldsByName[item.field],
      valuesConcatenated: item.values != null ? item.values.join() : '',
      ariaRowindex: i + 1,
      isPinned: pinnedFields.includes(item.field),
    }));

    const { pinnedRows, hfRows, restRows, defaultRows } = sortedFields.reduce<ItemsEntry>(
      (acc, curField) => {
        const isPinned = pinnedFields.includes(curField.field);
        if (hideEmptyFields && curField.valuesConcatenated === '') {
          return acc;
        }
        if (isPinned) {
          acc.pinnedRows.push(curField);
        } else if (highlightedFields.includes(curField.field) && showHighlightedFieldsOnTop) {
          acc.hfRows.push(curField);
        } else {
          acc.restRows.push(curField);
        }
        acc.defaultRows.push(curField);
        return acc;
      },
      {
        pinnedRows: [],
        hfRows: [],
        restRows: [],
        defaultRows: [],
      }
    );
    if (radio1Selected) {
      return [...pinnedRows, ...hfRows, ...restRows];
    }
    if (radio2Selected) {
      return showHighlightedFieldsOnTop
        ? [...hfRows, ...pinnedRows, ...restRows]
        : showPinnedFieldsOnTop
        ? [...pinnedRows, ...hfRows, ...restRows]
        : [...defaultRows];
    }
    if (radio3Selected) {
      if (showHighlightedFieldsOnTop && showPinnedFieldsOnTop) {
        return [...pinnedRows, ...hfRows];
      }
      if (showHighlightedFieldsOnTop) {
        return [...hfRows];
      }
      if (showPinnedFieldsOnTop) {
        return [...pinnedRows];
      }
      return [...pinnedRows, ...hfRows, ...restRows];
    }
    return [...defaultRows];
  }, [
    dataFormattedForFieldBrowser,
    fieldsByName,
    highlightedFields,
    pinnedFields,
    showHighlightedFieldsOnTop,
    showPinnedFieldsOnTop,
    hideEmptyFields,
    radio1Selected,
    radio2Selected,
    radio3Selected,
  ]);

  const getLinkValue = useCallback(
    (field: string) => {
      const columnHeader = columnHeaders.find((col) => col.id === field);
      if (!columnHeader || !columnHeader.linkField) {
        return null;
      }
      const linkFieldData = (dataFormattedForFieldBrowser ?? []).find(
        (d) => d.field === columnHeader.linkField
      );
      const linkFieldValue = getOr(null, 'originalValue', linkFieldData);
      return Array.isArray(linkFieldValue) ? linkFieldValue[0] : linkFieldValue;
    },
    [dataFormattedForFieldBrowser, columnHeaders]
  );

  // forces the rows of the table to render smaller fonts
  const onSetRowProps = useCallback(
    ({ field }: TimelineEventsDetailsItem) => ({
      className: 'flyout-table-row-small-font',
      'data-test-subj': `flyout-table-row-${field}`,
      ...(highlightedFields.includes(field) && {
        style: {
          backgroundColor: '#fff9e8',
          // backgroundColor: euiTheme.colors.highlight,
        },
      }),
    }),
    [highlightedFields]
    // [highlightedFields, euiTheme.colors]
  );

  const columns = useMemo(
    () =>
      getColumns({
        browserFields,
        eventId,
        scopeId,
        getLinkValue,
        ruleId,
        isPreview,
        onTogglePinned,
        pinnedFields,
      }),
    [browserFields, eventId, scopeId, getLinkValue, ruleId, isPreview, onTogglePinned, pinnedFields]
  );

  const searchForTable = useMemo(() => {
    return { ...search, toolsRight: renderToolsRight() };
  }, [renderToolsRight]);

  return (
    <>
      <TestRadioGroup
        radio1Selected={radio1Selected}
        radio2Selected={radio2Selected}
        radio3Selected={radio3Selected}
        onRadio1Change={onRadio1Change}
        onRadio2Change={onRadio2Change}
        onRadio3Change={onRadio3Change}
      />
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        items={items}
        itemId="field"
        columns={columns}
        onTableChange={onTableChange}
        pagination={{
          ...pagination,
          pageSizeOptions: COUNT_PER_PAGE_OPTIONS,
        }}
        rowProps={onSetRowProps}
        search={searchForTable}
        sorting={false}
        data-test-subj={TABLE_TAB_CONTENT_TEST_ID}
        css={css`
          .euiTableRow {
            font-size: ${smallFontSize};
          }
        `}
      />
    </>
  );
});

TableTab.displayName = 'TableTab';
