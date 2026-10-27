/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import {
  clearNightshiftRuleIdParam,
  getNightshiftRuleIdFromSearch,
  setNightshiftRuleIdParam,
} from '../../../common/url_params';
import { RuleFlyout } from '../../../components/entities/rule/rule_flyout';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { useDetectionRuleById, useDetectionRules } from '../../../data/rules/use_detection_rules';
import { useRulesDemote } from '../../../data/rules/use_rules_demote';
import { useBlocksNewActivity } from '../../../data/maintenance/use_significant_events_maintenance';
import { useKibana } from '../../../hooks/use_kibana';
import type { DetectionTimeRange } from '../use_detection_time_range';
import { DeleteRulesModal } from './delete_rules_modal';
import { RuleMatchesChart } from './rule_matches_chart';
import { RulesTable } from './rules_table';
import {
  CLEAR_SEARCH_LABEL,
  CLEAR_SELECTION_LABEL,
  DELETE_SELECTED_LABEL,
  ERROR_MESSAGE,
  ERROR_TITLE,
  NOT_FOUND_TITLE,
  NO_RULES_BODY,
  NO_RULES_TITLE,
  NO_SEARCH_RESULTS,
  NO_ENTITY_RESULTS,
  RETRY_LABEL,
  SEARCH_PLACEHOLDER,
} from './translations';

// Its own param, so the Rules search and the Events search both survive tab switches.
const RULES_SEARCH_QUERY_PARAM = 'rulesSearch';

export const RulesTab = ({
  timeRange,
  onTimeRangeChange,
  entities,
  unassigned,
}: {
  timeRange: DetectionTimeRange;
  onTimeRangeChange: (range: DetectionTimeRange) => void;
  entities: string[];
  unassigned: boolean;
}): React.ReactElement => {
  const history = useHistory();
  const location = useLocation();
  const { application, notifications } = useKibana().services;
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const rulesQuery = useDetectionRules(timeRange, { entities, unassigned });
  const hasEntityFilter = entities.length > 0 || unassigned;
  const { demoteRules, isPending } = useRulesDemote({});
  const [search, setSearch] = useState(
    () => new URLSearchParams(location.search).get(RULES_SEARCH_QUERY_PARAM) ?? ''
  );
  // Back/Forward restores that entry's search.
  useEffect(
    () =>
      history.listen((nextLocation, action) => {
        if (action !== 'POP') return;
        setSearch(new URLSearchParams(nextLocation.search).get(RULES_SEARCH_QUERY_PARAM) ?? '');
      }),
    [history]
  );
  // The search filters in the browser, so the URL is written at once: a tab switch can't lose it.
  const updateSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(history.location.search);
    if (value.trim()) params.set(RULES_SEARCH_QUERY_PARAM, value);
    else params.delete(RULES_SEARCH_QUERY_PARAM);
    history.replace({ ...history.location, search: `?${params.toString()}` });
  };
  const [selected, setSelected] = useState<DetectionRule[]>([]);
  const [pendingDelete, setPendingDelete] = useState<DetectionRule[]>();
  const openLinks = useRef(new Map<string, HTMLAnchorElement | HTMLButtonElement | null>());
  const ruleId = getNightshiftRuleIdFromSearch(location.search);
  const loadedRule = rulesQuery.rules.find(({ query }) => query.id === ruleId);
  // A deep link can point past the loaded first page or outside the entity selection; look that
  // rule up on its own.
  const needsLookup = Boolean(ruleId) && !loadedRule && (rulesQuery.isTruncated || hasEntityFilter);
  const ruleLookup = useDetectionRuleById(timeRange, ruleId, needsLookup);
  const activeRule = loadedRule ?? (needsLookup ? ruleLookup.rule : undefined);
  const filteredRules = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rulesQuery.rules.filter(
      ({ query }) =>
        query.title.toLowerCase().includes(term) || query.description.toLowerCase().includes(term)
    );
  }, [rulesQuery.rules, search]);

  const updateRuleId = useCallback(
    (id?: string, replace = false) => {
      const params = new URLSearchParams(location.search);
      if (id) setNightshiftRuleIdParam(params, id);
      else clearNightshiftRuleIdParam(params);
      const next = { ...location, search: `?${params.toString()}` };
      if (replace) history.replace(next);
      else history.push(next);
    },
    [history, location]
  );

  useEffect(() => {
    if (
      ruleId &&
      !activeRule &&
      rulesQuery.hasData &&
      !rulesQuery.isFetching &&
      !rulesQuery.isError &&
      (!needsLookup || ruleLookup.isResolved)
    ) {
      notifications.toasts.addWarning({ title: NOT_FOUND_TITLE });
      updateRuleId(undefined, true);
    }
  }, [
    ruleId,
    activeRule,
    rulesQuery.hasData,
    rulesQuery.isFetching,
    rulesQuery.isError,
    needsLookup,
    ruleLookup.isResolved,
    notifications.toasts,
    updateRuleId,
  ]);

  useEffect(() => {
    setSelected([]);
  }, [search, timeRange.from, timeRange.to, entities, unassigned]);

  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const handleClose = () => {
    const link = ruleId ? openLinks.current.get(ruleId) : undefined;
    updateRuleId();
    window.requestAnimationFrame(() => link?.focus());
  };
  const confirmDelete = async () => {
    if (!pendingDelete || !canManage || blocksActivity) return;
    if (ruleId && pendingDelete.some(({ query }) => query.id === ruleId))
      updateRuleId(undefined, true);
    try {
      await demoteRules(pendingDelete.map(({ query }) => query.id));
      setSelected([]);
      setPendingDelete(undefined);
    } catch {
      // The mutation already shows an error toast; leave the modal open for retry.
    }
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            fullWidth
            isClearable
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            aria-label={SEARCH_PLACEHOLDER}
            placeholder={SEARCH_PLACEHOLDER}
            data-test-subj="nightshiftDetectionRulesSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            compressed
            width="auto"
            showUpdateButton={false}
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={({ start, end }) => onTimeRangeChange({ from: start, to: end })}
            data-test-subj="nightshiftDetectionRulesTimePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {rulesQuery.isError && !rulesQuery.hasData ? (
        <KbnDangerCallout
          announceOnMount
          title={ERROR_TITLE}
          text={ERROR_MESSAGE}
          size="s"
          actionProps={{
            primary: {
              children: RETRY_LABEL,
              iconType: 'refresh',
              onClick: () => void rulesQuery.refetch(),
            },
          }}
        />
      ) : rulesQuery.hasData && rulesQuery.total === 0 && !hasEntityFilter ? (
        <EuiEmptyPrompt
          iconType="magnify"
          title={<h2>{NO_RULES_TITLE}</h2>}
          body={<p>{NO_RULES_BODY}</p>}
          data-test-subj="nightshiftDetectionRulesEmpty"
        />
      ) : (
        <>
          <RuleMatchesChart rules={rulesQuery.rules} loading={rulesQuery.isLoading} />
          <EuiSpacer size="m" />
          {rulesQuery.isTruncated ? (
            <>
              <KbnInfoCallout
                title={i18n.translate('xpack.nightshift.detectionPage.rules.truncated', {
                  defaultMessage: 'Showing the first 1,000 of {total} rules.',
                  values: { total: rulesQuery.total },
                })}
                size="s"
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.nightshift.detectionPage.rules.count', {
                  defaultMessage: '{count, plural, one {# rule} other {# rules}}',
                  values: { count: filteredRules.length },
                })}
              </EuiText>
            </EuiFlexItem>
            {canManage ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="nightshiftRulesTabButton"
                    size="xs"
                    iconType="cross"
                    disabled={selected.length === 0}
                    onClick={() => setSelected([])}
                    {...getEbtProps({
                      action: NIGHTSHIFT_EBT_ACTIONS.CLEAR_RULES_SELECTION,
                      element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_RULES_TABLE,
                    })}
                  >
                    {CLEAR_SELECTION_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="nightshiftRulesTabButton"
                    size="xs"
                    iconType="trash"
                    color="danger"
                    disabled={selected.length === 0 || blocksActivity}
                    title={activityBlockTooltip}
                    onClick={() => setPendingDelete(selected)}
                    {...getEbtProps({
                      action: NIGHTSHIFT_EBT_ACTIONS.DELETE_RULES,
                      element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_RULES_TABLE,
                    })}
                  >
                    {DELETE_SELECTED_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {selected.length > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('xpack.nightshift.detectionPage.rules.selected', {
                        defaultMessage: '{count} selected',
                        values: { count: selected.length },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                ) : null}
              </>
            ) : null}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {rulesQuery.hasData && filteredRules.length === 0 ? (
            <EuiEmptyPrompt
              iconType="magnify"
              title={
                <h2>{!search.trim() && hasEntityFilter ? NO_ENTITY_RESULTS : NO_SEARCH_RESULTS}</h2>
              }
              actions={
                search.trim() ? (
                  <EuiButton
                    data-test-subj="nightshiftRulesTabButton"
                    onClick={() => updateSearch('')}
                    {...getEbtProps({
                      action: NIGHTSHIFT_EBT_ACTIONS.CLEAR_RULES_SEARCH,
                      element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_RULES_TABLE,
                    })}
                  >
                    {CLEAR_SEARCH_LABEL}
                  </EuiButton>
                ) : undefined
              }
            />
          ) : (
            <RulesTable
              rules={filteredRules}
              loading={rulesQuery.isFetching}
              selectedRuleId={ruleId}
              selected={selected}
              canManage={canManage}
              blocksActivity={blocksActivity}
              activityBlockTooltip={activityBlockTooltip}
              timeRange={timeRange}
              onOpen={(rule) => updateRuleId(rule.query.id)}
              onDelete={(rule) => setPendingDelete([rule])}
              onSelectionChange={setSelected}
              onOpenLinkMount={(id, element) => openLinks.current.set(id, element)}
            />
          )}
        </>
      )}
      {activeRule ? (
        <RuleFlyout
          rule={activeRule}
          timeRange={timeRange}
          getSourceTitle={rulesQuery.getSourceTitle}
          canManage={canManage}
          blocksActivity={blocksActivity}
          activityBlockTooltip={activityBlockTooltip}
          onClose={handleClose}
          onDeleteRequest={(rule) => setPendingDelete([rule])}
        />
      ) : null}
      {pendingDelete ? (
        <DeleteRulesModal
          rules={pendingDelete}
          isLoading={isPending}
          onConfirm={() => void confirmDelete()}
          onClose={() => setPendingDelete(undefined)}
        />
      ) : null}
    </>
  );
};
