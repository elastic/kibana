/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import type { DetectionEntity } from '@kbn/significant-events-plugin/common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../common/ebt_constants';
import { useDetectionEntities } from '../../../data/detection_entities/use_detection_entities';
import type { DetectionTimeRange } from '../use_detection_time_range';
import type { EntitySelection } from '../use_entity_selection';
import { MAX_SELECTED_ENTITIES } from '../use_entity_selection';
import {
  CLEAR_LABEL,
  DATABASES_LABEL,
  EMPTY_DESCRIPTION,
  ENTITIES_TITLE,
  ERROR_TITLE,
  FILTER_LABEL,
  getActiveEventsTooltip,
  EVENTS_FILTER_GROUP_LABEL,
  HAVE_RULES_LABEL,
  KNOWLEDGE_LINK,
  NO_ENTITY_GROUP_LABEL,
  UNASSIGNED_LABEL,
  UNASSIGNED_UNAVAILABLE_TOOLTIP,
  NO_MATCHES_DESCRIPTION,
  NOT_LOADED_LABEL,
  NO_RULES_LABEL,
  OTHER_LABEL,
  RETRY_LABEL,
  RULES_FILTER_GROUP_LABEL,
  SEARCH_PLACEHOLDER,
  SERVICES_LABEL,
  SIGNIFICANT_EVENTS_FILTER_LABEL,
  STORAGE_LABEL,
  TRUNCATED_DESCRIPTION,
  UNKNOWN_LABEL,
} from './translations';

const ENTITY_GROUPS = [
  { subtypes: ['service', 'api_service'], label: SERVICES_LABEL, icon: 'cube' },
  { subtypes: ['database'], label: DATABASES_LABEL, icon: 'database' },
  { subtypes: ['storage'], label: STORAGE_LABEL, icon: 'storage' },
  { subtypes: [], label: OTHER_LABEL, icon: 'tokenKey' },
] as const;

type EntityOption = EuiSelectableOption;
const ATTRIBUTE_FILTERS = ['have_rules', 'no_rules', 'significant_events'] as const;
type AttributeFilter = (typeof ATTRIBUTE_FILTERS)[number];
const isAttributeFilter = (key?: string): key is AttributeFilter =>
  ATTRIBUTE_FILTERS.includes(key as AttributeFilter);

// Entities with active significant events lead each group, busiest first; the rest follow A to Z.
const compareEntities = (left: DetectionEntity, right: DetectionEntity): number =>
  right.active_events - left.active_events || left.name.localeCompare(right.name);

export const EntitiesPanel = ({
  timeRange,
  selection,
  knowledgeHref,
  onKnowledgeClick,
}: {
  timeRange: DetectionTimeRange;
  selection: EntitySelection;
  knowledgeHref?: string;
  onKnowledgeClick?: () => void;
}): React.ReactElement => {
  const query = useDetectionEntities(timeRange);
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>([]);
  const { entities: selected, unassigned, clear, toggleEntity, toggleUnassigned } = selection;
  const entities = query.data?.entities ?? [];
  const term = search.trim().toLowerCase();
  const haveRules = attributeFilters.includes('have_rules');
  const noRules = attributeFilters.includes('no_rules');
  const withEvents = attributeFilters.includes('significant_events');
  const matches = (name: string, rules: number, activeEvents: number) =>
    name.toLowerCase().includes(term) &&
    (haveRules === noRules || (haveRules ? rules > 0 : rules === 0)) &&
    (!withEvents || activeEvents > 0);
  const makeOption = (
    entity: Pick<DetectionEntity, 'id' | 'name' | 'active_events'>,
    icon: string,
    isUnassigned = false
  ): EntityOption => ({
    key: isUnassigned ? 'unassigned:' : entity.id,
    // EUI restores focus by label, so it must be unique even when names repeat.
    label: isUnassigned ? 'unassigned:' : entity.id,
    searchableLabel: entity.name,
    'aria-label': entity.name,
    checked: (isUnassigned ? unassigned : selected.includes(entity.id)) ? 'on' : undefined,
    disabled:
      !isUnassigned && !selected.includes(entity.id) && selected.length >= MAX_SELECTED_ENTITIES,
    prepend: <EuiIcon type={icon} aria-hidden />,
    append:
      entity.active_events > 0 ? (
        <EuiBadge color="danger">{entity.active_events}</EuiBadge>
      ) : undefined,
    toolTipContent:
      entity.active_events > 0 ? getActiveEventsTooltip(entity.active_events) : undefined,
    ...getEbtProps({
      action: NIGHTSHIFT_EBT_ACTIONS.FILTER_DETECTIONS_BY_ENTITY,
      element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_ENTITIES_PANEL,
      detail: isUnassigned
        ? NIGHTSHIFT_EBT_DETAILS.UNASSIGNED_ENTITIES
        : NIGHTSHIFT_EBT_DETAILS.ENTITY,
    }),
  });
  const options: EntityOption[] = [];
  for (const group of ENTITY_GROUPS) {
    const matching = entities.filter((entity) => {
      const entityGroup =
        ENTITY_GROUPS.find(({ subtypes }) =>
          (subtypes as readonly string[]).includes(entity.subtype)
        ) ?? ENTITY_GROUPS[3];
      return entityGroup === group && matches(entity.name, entity.rules, entity.active_events);
    });
    if (matching.length) {
      options.push({ key: `group:${group.icon}`, label: group.label, isGroupLabel: true });
      options.push(
        ...matching.sort(compareEntities).map((entity) => makeOption(entity, group.icon))
      );
    }
  }
  const liveIds = new Set(entities.map(({ id }) => id));
  const isTruncated = Boolean(query.data?.truncated);
  const unknown = query.data ? selected.filter((id) => !liveIds.has(id) && matches(id, 0, 0)) : [];
  if (unknown.length) {
    // A truncated list can't tell an expired slug from one past the cap, so don't call it expired.
    options.push({
      key: 'group:unknown',
      label: isTruncated ? NOT_LOADED_LABEL : UNKNOWN_LABEL,
      isGroupLabel: true,
    });
    options.push(
      ...unknown.map((id) => makeOption({ id, name: id, active_events: 0 }, 'tokenKey'))
    );
  }
  const unassignedCounts = query.data?.unassigned;
  // Without counts (truncated list) Unassigned isn't applied; a selected one still shows so it can be cleared.
  const unassignedRow = unassignedCounts ?? (unassigned ? { rules: 0, active_events: 0 } : null);
  if (
    query.data &&
    unassignedRow &&
    matches(UNASSIGNED_LABEL, unassignedRow.rules, unassignedRow.active_events)
  ) {
    // Its own section, so it doesn't read as part of the last entity group.
    options.push({ key: 'group:no-entity', label: NO_ENTITY_GROUP_LABEL, isGroupLabel: true });
    options.push({
      ...makeOption(
        { id: 'unassigned:', name: UNASSIGNED_LABEL, active_events: unassignedRow.active_events },
        'question',
        true
      ),
      ...(unassignedCounts ? {} : { toolTipContent: UNASSIGNED_UNAVAILABLE_TOOLTIP }),
    });
  }
  const isChecked = (key: AttributeFilter) => (attributeFilters.includes(key) ? 'on' : undefined);
  const filterOptions: EuiSelectableOption[] = [
    { label: RULES_FILTER_GROUP_LABEL, isGroupLabel: true },
    { label: HAVE_RULES_LABEL, key: 'have_rules', checked: isChecked('have_rules') },
    { label: NO_RULES_LABEL, key: 'no_rules', checked: isChecked('no_rules') },
    { label: EVENTS_FILTER_GROUP_LABEL, isGroupLabel: true },
    {
      label: SIGNIFICANT_EVENTS_FILTER_LABEL,
      key: 'significant_events',
      checked: isChecked('significant_events'),
    },
  ];
  const hasAttributeFilter = haveRules !== noRules || withEvents;
  const filterButton = (
    <EuiPopover
      isOpen={isFilterOpen}
      closePopover={() => setIsFilterOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downRight"
      aria-label={FILTER_LABEL}
      button={
        <EuiToolTip content={FILTER_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="nightshiftEntitiesPanelButton"
            iconType="filter"
            aria-label={FILTER_LABEL}
            aria-expanded={isFilterOpen}
            aria-pressed={hasAttributeFilter}
            color={hasAttributeFilter ? 'primary' : 'text'}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          />
        </EuiToolTip>
      }
    >
      <EuiSelectable
        aria-label={FILTER_LABEL}
        options={filterOptions}
        onChange={(next) =>
          setAttributeFilters(
            next.flatMap(({ checked, key }) =>
              checked === 'on' && isAttributeFilter(key) ? [key] : []
            )
          )
        }
        listProps={{ bordered: false, isVirtualized: false, showIcons: true }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="nightshiftDetectionEntitiesPanel"
      css={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h2>{ENTITIES_TITLE}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge color="subdued">{entities.length}</EuiNotificationBadge>
        </EuiFlexItem>
        <EuiFlexItem />
        {selected.length > 0 || unassigned || attributeFilters.length > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="nightshiftEntitiesPanelButton"
              size="xs"
              onClick={() => {
                clear();
                setAttributeFilters([]);
                setSearch('');
              }}
            >
              {CLEAR_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSelectable
        aria-label={ENTITIES_TITLE}
        searchable
        isPreFiltered
        height="full"
        css={{ minHeight: 0 }}
        options={options}
        renderOption={(option) => option.searchableLabel ?? option.label}
        searchProps={{
          value: search,
          onChange: setSearch,
          placeholder: SEARCH_PLACEHOLDER,
          compressed: true,
          append: filterButton,
        }}
        listProps={{ bordered: false, showIcons: true }}
        emptyMessage={NO_MATCHES_DESCRIPTION}
        noMatchesMessage={NO_MATCHES_DESCRIPTION}
        onChange={(_, __, changed) => {
          if (changed.key === 'unassigned:') toggleUnassigned();
          else if (changed.key) toggleEntity(changed.key);
        }}
      >
        {(list, searchInput) => (
          <>
            {searchInput}
            <EuiSpacer size="s" />
            {query.isLoading ? (
              <EuiSkeletonText lines={6} />
            ) : query.isError && !query.data ? (
              <KbnDangerCallout
                announceOnMount
                size="s"
                title={ERROR_TITLE}
                actionProps={{
                  primary: {
                    children: RETRY_LABEL,
                    iconType: 'refresh',
                    onClick: () => void query.refetch(),
                  },
                }}
              />
            ) : (
              <>
                {entities.length === 0 ? (
                  <EuiText size="s" color="subdued">
                    <p>
                      {EMPTY_DESCRIPTION}{' '}
                      <EuiLink
                        data-test-subj="nightshiftEntitiesPanelLink"
                        href={knowledgeHref}
                        onClick={onKnowledgeClick}
                      >
                        {KNOWLEDGE_LINK}
                      </EuiLink>
                    </p>
                  </EuiText>
                ) : null}
                {list}
              </>
            )}
          </>
        )}
      </EuiSelectable>
      {query.data?.truncated ? (
        <EuiText size="xs" color="subdued">
          <p>{TRUNCATED_DESCRIPTION}</p>
        </EuiText>
      ) : null}
    </EuiPanel>
  );
};
