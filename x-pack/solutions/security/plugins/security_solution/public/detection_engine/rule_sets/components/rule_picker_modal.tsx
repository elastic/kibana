/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { fetchSearchRules } from '../../rule_management/api/api';
import * as i18n from './translations';

const PAGE_SIZE = 10;
const MAX_SELECT_ALL = 10_000;

export interface PickedRule {
  rule_id: string;
  name: string;
}

interface RulePickerModalProps {
  title: string;
  initial: PickedRule[];
  /** KQL that limits the rules the picker shows, for example the group conditions. */
  filter?: string;
  onClose: () => void;
  onConfirm: (rules: PickedRule[]) => void;
}

/** Pick rules by hand. The result is a list of `rule_id`s, which survive import and export. */
export const RulePickerModal = ({
  title,
  initial,
  filter,
  onClose,
  onConfirm,
}: RulePickerModalProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const titleId = useGeneratedHtmlId();
  const [picked, setPicked] = useState<Map<string, string>>(
    () => new Map(initial.map((rule) => [rule.rule_id, rule.name]))
  );
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  useDebounce(
    () => {
      setSearch(searchInput.trim());
      setPageIndex(0);
    },
    300,
    [searchInput]
  );

  const searchArgs = {
    ...(filter ? { filter: { term: filter, mode: 'KQL' as const } } : {}),
    ...(search ? { search: { term: search, mode: 'legacy' as const } } : {}),
    sort_field: 'name' as const,
    sort_order: 'asc' as const,
  };
  const { data, isFetching } = useQuery(
    ['ruleSetsRulePicker', searchArgs, pageIndex],
    ({ signal }) =>
      fetchSearchRules({
        ...searchArgs,
        pagination: { page: pageIndex + 1, perPage: PAGE_SIZE },
        fields: ['name', 'rule_id', 'type', 'severity'],
        signal,
      }),
    { keepPreviousData: true, refetchOnWindowFocus: false }
  );
  const rules = data?.data ?? [];
  const total = data?.total ?? 0;

  const toggle = (rule: RuleResponse, on: boolean) =>
    setPicked((current) => {
      const next = new Map(current);
      if (on) next.set(rule.rule_id, rule.name);
      else next.delete(rule.rule_id);
      return next;
    });

  const selectAllMatching = async () => {
    setIsSelectingAll(true);
    try {
      const response = await fetchSearchRules({
        ...searchArgs,
        pagination: { page: 1, perPage: MAX_SELECT_ALL },
        fields: ['name', 'rule_id', 'type', 'severity'],
      });
      setPicked((current) => {
        const next = new Map(current);
        response.data.forEach((rule) => next.set(rule.rule_id, rule.name));
        return next;
      });
    } finally {
      setIsSelectingAll(false);
    }
  };

  const columns: Array<EuiBasicTableColumn<RuleResponse>> = [
    { field: 'name', name: i18n.COLUMN_RULE, truncateText: true, width: '60%' },
    {
      field: 'type',
      name: i18n.COLUMN_TYPE,
      render: (type: string) => i18n.RULE_TYPE_LABELS[type] ?? type,
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (severity: string) => i18n.SEVERITY_LABELS[severity] ?? severity,
    },
  ];

  return (
    <EuiModal aria-labelledby={titleId} onClose={onClose} css={{ width: '80vw', maxWidth: 1100 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s" id={titleId}>
          {title}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder={i18n.PICKER_SEARCH}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              isLoading={isFetching}
              data-test-subj="ruleSetsPickerSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="documentsCheck"
              onClick={selectAllMatching}
              isLoading={isSelectingAll}
              isDisabled={total === 0}
            >
              {i18n.PICKER_SELECT_ALL(total)}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="cross" onClick={() => setPicked(new Map())}>
              {i18n.PICKER_CLEAR}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable<RuleResponse>
          tableCaption={title}
          items={rules}
          itemId="rule_id"
          columns={columns}
          loading={isFetching}
          tableLayout="fixed"
          compressed
          selection={{
            selected: rules.filter((rule) => picked.has(rule.rule_id)),
            onSelectionChange: (selected) => {
              const selectedIds = new Set(selected.map((rule) => rule.rule_id));
              rules.forEach((rule) => {
                const isOn = selectedIds.has(rule.rule_id);
                if (isOn !== picked.has(rule.rule_id)) toggle(rule, isOn);
              });
            },
          }}
          pagination={{
            pageIndex,
            pageSize: PAGE_SIZE,
            totalItemCount: total,
            showPerPageOptions: false,
          }}
          onChange={({ page }: Criteria<RuleResponse>) => page && setPageIndex(page.index)}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18n.PICKER_SELECTED(picked.size)}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL}</EuiButtonEmpty>
              <EuiButton
                fill
                onClick={() => {
                  onConfirm([...picked].map(([ruleId, name]) => ({ rule_id: ruleId, name })));
                  onClose();
                }}
                data-test-subj="ruleSetsPickerDone"
              >
                {i18n.DONE}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
