/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Page-level filter bar shown under the Entity analytics title. Default order:
 * Entity type, Risk level, Asset criticality, Data source, Watchlist.
 *
 * Behaviour replicates the Alerts page filter group (`FilterGroup` in
 * @kbn/alerts-ui-shared plus the controls renderer it wraps):
 *
 *   - a Filter group menu with Reset Controls / Edit Controls | Discard Changes
 *   - edit mode adds a grab handle to each control for drag reordering, plus
 *     Add and Save buttons
 *   - hovering a control while editing reveals Edit (pencil) and Remove (trash)
 *   - Add and Edit open the control editor flyout (Field / Control type / Label)
 *
 * The controls themselves stay as the facelift's own `MultiselectFilter`s.
 * Max visible controls is EA-local (5) — Alerts stays at 4.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { capitalize } from 'lodash';
import { CriticalityLevels } from '../../../../../../common/constants';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskLevels } from '../../../../../../common/api/entity_analytics/common';
import { MultiselectFilter } from '../../../../../common/components/multiselect_filter';
import { AssetCriticalityBadge } from '../../../asset_criticality';
import { CRITICALITY_LEVEL_TITLE } from '../../../asset_criticality/translations';
import { EntityIconByType } from '../../../entity_store/entity_icon_by_type';
import { getRiskScoreColors } from '../../entities_table/risk_score_cell';
import type { FaceliftRiskLevel, FaceliftWatchlist, PageFilters, TableView } from './data';
import { EMPTY_PAGE_FILTERS, ENTITY_SOURCE_LABELS, FACELIFT_WATCHLISTS, RISK_LEVELS } from './data';
import type { FilterFacet } from './entity_store_fields';
import { getFieldFacet } from './entity_store_fields';
import { facetCount, getFilterFacetCounts } from './filter_facet_counts';
import { FilterControlClone } from './filter_control_clone';
import type { FilterControlDraft } from './filter_control_editor';
import { DEFAULT_CONTROL_TYPE, FilterControlEditor } from './filter_control_editor';
import { FilterGroupMenu } from './filter_group_menu';
import { SortableFilterControl } from './sortable_filter_control';

/** EA-local ceiling — Alerts FilterGroup remains at 4. */
const MAX_CONTROLS = 5;

interface FilterControlInstance {
  id: string;
  fieldName: string;
  /** Undefined falls back to the field name, as in the real editor. */
  title?: string;
  controlType: string;
}

const DEFAULT_CONTROLS: FilterControlInstance[] = [
  {
    id: 'entityType',
    fieldName: 'entity.type',
    title: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.entityType', {
      defaultMessage: 'Entity type',
    }),
    controlType: DEFAULT_CONTROL_TYPE,
  },
  {
    id: 'riskLevel',
    fieldName: 'entity.risk.calculated_level',
    title: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.riskLevel', {
      defaultMessage: 'Risk level',
    }),
    controlType: DEFAULT_CONTROL_TYPE,
  },
  {
    id: 'assetCriticality',
    fieldName: 'asset.criticality',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.homePage.filters.assetCriticality',
      { defaultMessage: 'Asset criticality' }
    ),
    controlType: DEFAULT_CONTROL_TYPE,
  },
  {
    id: 'dataSource',
    fieldName: 'entity.source',
    title: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.entitySource', {
      defaultMessage: 'Data source',
    }),
    controlType: DEFAULT_CONTROL_TYPE,
  },
  {
    id: 'watchlist',
    fieldName: 'entity.attributes.watchlists',
    title: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.watchlist', {
      defaultMessage: 'Watchlist',
    }),
    controlType: DEFAULT_CONTROL_TYPE,
  },
];

const ADD_CONTROLS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.addControls',
  { defaultMessage: 'Add Controls' }
);

const ADD_CONTROLS_MAX_LIMIT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.addControlsMaxLimit',
  { defaultMessage: 'Maximum of 5 controls can be added.' }
);

const SAVE_CHANGES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.saveChanges',
  { defaultMessage: 'Save Changes' }
);

const PENDING_CHANGES_REMINDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.pendingChanges',
  { defaultMessage: 'Save pending changes' }
);

const FILTER_GROUP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.filterGroup.ariaLabel',
  { defaultMessage: 'Entity filter controls' }
);

const ENTITY_TYPES = [EntityType.user, EntityType.host, EntityType.service];

const CRITICALITY_LEVELS: CriticalityLevelWithUnassigned[] = [
  CriticalityLevels.EXTREME_IMPACT,
  CriticalityLevels.HIGH_IMPACT,
  CriticalityLevels.MEDIUM_IMPACT,
  CriticalityLevels.LOW_IMPACT,
  'unassigned',
];

/**
 * Risk-score badge colours speak EntityRiskLevels ("Moderate"); the Overview
 * band and this filter speak FaceliftRiskLevel ("Medium"). Same bands.
 */
const RISK_SCORE_LEVEL_BY_FACELIFT: Record<FaceliftRiskLevel, EntityRiskLevels> = {
  Unknown: 'Unknown',
  Low: 'Low',
  Medium: 'Moderate',
  High: 'High',
  Critical: 'Critical',
};

const controlTitle = (control: FilterControlInstance) => control.title ?? control.fieldName;

const clearFacetSelection = (filters: PageFilters, facet: FilterFacet): PageFilters => {
  switch (facet) {
    case 'entityTypes':
      return { ...filters, entityTypes: [] };
    case 'riskLevels':
      return { ...filters, riskLevels: [] };
    case 'criticalities':
      return { ...filters, criticalities: [] };
    case 'sources':
      return { ...filters, sources: [] };
    case 'watchlists':
      return { ...filters, watchlists: [] };
  }
};

const sameControls = (a: FilterControlInstance[], b: FilterControlInstance[]) =>
  a.length === b.length &&
  a.every((control, index) => {
    const other = b[index];
    return (
      control.id === other.id &&
      control.fieldName === other.fieldName &&
      control.title === other.title &&
      control.controlType === other.controlType
    );
  });

const OptionWithCount: React.FC<{ count: number; children: React.ReactNode }> = ({
  count,
  children,
}) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    justifyContent="spaceBetween"
    responsive={false}
    css={css`
      inline-size: 100%;
    `}
  >
    <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {count}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const RiskLevelFilterBadge: React.FC<{ level: FaceliftRiskLevel }> = ({ level }) => {
  const { euiTheme } = useEuiTheme();
  const colors = getRiskScoreColors(euiTheme, RISK_SCORE_LEVEL_BY_FACELIFT[level]);

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        size="xs"
        color={colors.text}
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: inherit;
        `}
      >
        {level}
      </EuiText>
    </EuiBadge>
  );
};

export interface EntityFiltersGroupProps {
  pageFilters: PageFilters;
  onPageFiltersChange: (next: PageFilters) => void;
  /** Kept for FaceliftHome / page wiring compatibility; v.5 uses pageFilters.watchlists. */
  selectedWatchlistId?: string;
  onWatchlistChange?: (id?: string, name?: string) => void;
  /** Drives facet counts for the current Resolved / Raw table corpus. */
  tableView: TableView;
}

type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; controlId: string };

export const EntityFiltersGroup: React.FC<EntityFiltersGroupProps> = ({
  pageFilters,
  onPageFiltersChange,
  tableView,
}) => {
  const counts = useMemo(() => getFilterFacetCounts(tableView), [tableView]);

  const [isViewMode, setIsViewMode] = useState(true);
  const [savedControls, setSavedControls] = useState<FilterControlInstance[]>(DEFAULT_CONTROLS);
  const [draftControls, setDraftControls] = useState<FilterControlInstance[]>(DEFAULT_CONTROLS);
  const [editorState, setEditorState] = useState<EditorState>({ mode: 'closed' });
  const [pendingPopoverOpen, setPendingPopoverOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const controlRefs = useRef<Record<string, HTMLElement | null>>({});
  const setControlRef = useCallback((id: string, ref: HTMLElement | null) => {
    controlRefs.current[id] = ref;
  }, []);

  const displayedControls = isViewMode ? savedControls : draftControls;
  const hasPendingChanges = !isViewMode && !sameControls(draftControls, savedControls);
  const atMaxControls = draftControls.length >= MAX_CONTROLS;
  const isEditorOpen = editorState.mode !== 'closed';

  /** Alerts surfaces the reminder as soon as a change lands, not just on hover. */
  useEffect(() => {
    setPendingPopoverOpen(hasPendingChanges);
  }, [hasPendingChanges]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onSelectEntityTypes = useCallback(
    (entityTypes: EntityType[]) => onPageFiltersChange({ ...pageFilters, entityTypes }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectWatchlists = useCallback(
    (watchlists: FaceliftWatchlist[]) => onPageFiltersChange({ ...pageFilters, watchlists }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectSources = useCallback(
    (sources: string[]) => onPageFiltersChange({ ...pageFilters, sources }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectRiskLevels = useCallback(
    (riskLevels: FaceliftRiskLevel[]) => onPageFiltersChange({ ...pageFilters, riskLevels }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectCriticalities = useCallback(
    (criticalities: CriticalityLevelWithUnassigned[]) =>
      onPageFiltersChange({ ...pageFilters, criticalities }),
    [pageFilters, onPageFiltersChange]
  );

  const switchToEditMode = useCallback(() => {
    setDraftControls(savedControls);
    setIsViewMode(false);
  }, [savedControls]);

  const discardChanges = useCallback(() => {
    setDraftControls(savedControls);
    setIsViewMode(true);
    setEditorState({ mode: 'closed' });
  }, [savedControls]);

  /** Drops selections for facets no longer on screen — removals and field swaps alike. */
  const clearOrphanedSelections = useCallback(
    (controls: FilterControlInstance[]) => {
      const visibleFacets = new Set(
        controls.map((control) => getFieldFacet(control.fieldName)).filter(Boolean)
      );
      const orphaned = savedControls
        .map((control) => getFieldFacet(control.fieldName))
        .filter((facet): facet is FilterFacet => Boolean(facet) && !visibleFacets.has(facet));

      if (!orphaned.length) return;

      onPageFiltersChange(
        orphaned.reduce((filters, facet) => clearFacetSelection(filters, facet), pageFilters)
      );
    },
    [onPageFiltersChange, pageFilters, savedControls]
  );

  const saveChanges = useCallback(() => {
    clearOrphanedSelections(draftControls);
    setSavedControls(draftControls);
    setIsViewMode(true);
    setEditorState({ mode: 'closed' });
  }, [clearOrphanedSelections, draftControls]);

  const resetControls = useCallback(() => {
    setSavedControls(DEFAULT_CONTROLS);
    setDraftControls(DEFAULT_CONTROLS);
    setIsViewMode(true);
    setEditorState({ mode: 'closed' });
    onPageFiltersChange(EMPTY_PAGE_FILTERS);
  }, [onPageFiltersChange]);

  const removeControl = useCallback((controlId: string) => {
    setDraftControls((prev) => prev.filter((control) => control.id !== controlId));
  }, []);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    const oldIndex = active?.data.current?.sortable.index;
    const newIndex = over?.data.current?.sortable.index;
    if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
      setDraftControls((prev) => arrayMove([...prev], oldIndex, newIndex));
    }
    // hide hover actions on drop; otherwise they get stuck visible
    (document.activeElement as HTMLElement)?.blur();
    setDraggingId(null);
  }, []);

  const onEditorSave = useCallback(
    (draft: FilterControlDraft) => {
      const { fieldName, title, controlType } = draft;
      if (!fieldName) return;

      if (editorState.mode === 'create') {
        setDraftControls((prev) =>
          prev.length >= MAX_CONTROLS
            ? prev
            : [...prev, { id: `control-${fieldName}-${Date.now()}`, fieldName, title, controlType }]
        );
      } else if (editorState.mode === 'edit') {
        setDraftControls((prev) =>
          prev.map((control) =>
            control.id === editorState.controlId
              ? { ...control, fieldName, title, controlType }
              : control
          )
        );
      }

      setEditorState({ mode: 'closed' });
    },
    [editorState]
  );

  const renderEntityType = useCallback(
    (entityType: EntityType) => (
      <OptionWithCount count={facetCount(counts, 'entityTypes', entityType)}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={EntityIconByType[entityType]}
              size="s"
              color="subdued"
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{capitalize(entityType)}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </OptionWithCount>
    ),
    [counts]
  );

  const renderWatchlist = useCallback(
    (watchlist: FaceliftWatchlist) => (
      <OptionWithCount count={facetCount(counts, 'watchlists', watchlist)}>
        <EuiText size="s">{watchlist}</EuiText>
      </OptionWithCount>
    ),
    [counts]
  );

  const renderSource = useCallback(
    (source: string) => (
      <OptionWithCount count={facetCount(counts, 'sources', source)}>
        <EuiText size="s">{source}</EuiText>
      </OptionWithCount>
    ),
    [counts]
  );

  const renderRiskLevel = useCallback(
    (level: FaceliftRiskLevel) => (
      <OptionWithCount count={facetCount(counts, 'riskLevels', level)}>
        <RiskLevelFilterBadge level={level} />
      </OptionWithCount>
    ),
    [counts]
  );

  const renderCriticality = useCallback(
    (level: CriticalityLevelWithUnassigned) => (
      <OptionWithCount count={facetCount(counts, 'criticalities', level)}>
        <AssetCriticalityBadge criticalityLevel={level} css={{ lineHeight: 'inherit' }} />
      </OptionWithCount>
    ),
    [counts]
  );

  /**
   * Only the five mock-backed facets have option values; any other Entity
   * Store field renders an empty control.
   */
  const renderControl = (control: FilterControlInstance) => {
    const title = controlTitle(control);

    switch (getFieldFacet(control.fieldName)) {
      case 'entityTypes':
        return (
          <MultiselectFilter<EntityType>
            data-test-subj="eaFaceliftEntityTypeFilter"
            title={title}
            items={ENTITY_TYPES}
            selectedItems={pageFilters.entityTypes}
            onSelectionChange={onSelectEntityTypes}
            renderItem={renderEntityType}
            renderLabel={capitalize}
            width={200}
            grow
          />
        );
      case 'riskLevels':
        return (
          <MultiselectFilter<FaceliftRiskLevel>
            data-test-subj="eaFaceliftRiskLevelFilter"
            title={title}
            items={RISK_LEVELS}
            selectedItems={pageFilters.riskLevels}
            onSelectionChange={onSelectRiskLevels}
            renderItem={renderRiskLevel}
            width={180}
            grow
          />
        );
      case 'criticalities':
        return (
          <MultiselectFilter<CriticalityLevelWithUnassigned>
            data-test-subj="eaFaceliftAssetCriticalityFilter"
            title={title}
            items={CRITICALITY_LEVELS}
            selectedItems={pageFilters.criticalities}
            onSelectionChange={onSelectCriticalities}
            renderItem={renderCriticality}
            renderLabel={(level) => CRITICALITY_LEVEL_TITLE[level]}
            width={230}
            grow
          />
        );
      case 'sources':
        return (
          <MultiselectFilter<string>
            data-test-subj="eaFaceliftEntitySourceFilter"
            title={title}
            items={ENTITY_SOURCE_LABELS}
            selectedItems={pageFilters.sources}
            onSelectionChange={onSelectSources}
            renderItem={renderSource}
            width={220}
            grow
          />
        );
      case 'watchlists':
        return (
          <MultiselectFilter<FaceliftWatchlist>
            data-test-subj="eaFaceliftWatchlistFilter"
            title={title}
            items={[...FACELIFT_WATCHLISTS]}
            selectedItems={pageFilters.watchlists}
            onSelectionChange={onSelectWatchlists}
            renderItem={renderWatchlist}
            width={260}
            grow
          />
        );
      default:
        return (
          <MultiselectFilter<string>
            data-test-subj={`eaFaceliftEmptyFilter-${control.fieldName}`}
            title={title}
            items={[]}
            selectedItems={[]}
            width={220}
            grow
          />
        );
    }
  };

  const editorInitialDraft = useMemo<FilterControlDraft | undefined>(() => {
    if (editorState.mode !== 'edit') return undefined;
    const control = draftControls.find(({ id }) => id === editorState.controlId);
    if (!control) return undefined;
    return {
      fieldName: control.fieldName,
      title: control.title,
      controlType: control.controlType,
    };
  }, [draftControls, editorState]);

  const draggingControl = draggingId
    ? displayedControls.find(({ id }) => id === draggingId)
    : undefined;

  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        data-test-subj="eaFaceliftEntityFilters"
      >
        <EuiFlexItem grow={true}>
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => setDraggingId(`${active.id}`)}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDraggingId(null)}
            measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
          >
            <SortableContext items={displayedControls} strategy={rectSortingStrategy}>
              <EuiFlexGroup
                component="ul"
                gutterSize="s"
                alignItems="center"
                responsive={false}
                aria-label={FILTER_GROUP}
                css={css`
                  margin-block: 0;
                  padding-inline: 0;
                  list-style: none;
                `}
              >
                {displayedControls.map((control) => (
                  <SortableFilterControl
                    key={control.id}
                    id={control.id}
                    title={controlTitle(control)}
                    isEditable={!isViewMode}
                    areHoverActionsHidden={isEditorOpen}
                    onEdit={() => setEditorState({ mode: 'edit', controlId: control.id })}
                    onRemove={() => removeControl(control.id)}
                    setControlRef={setControlRef}
                  >
                    {renderControl(control)}
                  </SortableFilterControl>
                ))}
              </EuiFlexGroup>
            </SortableContext>
            <DragOverlay>
              {draggingControl ? (
                <FilterControlClone
                  title={controlTitle(draggingControl)}
                  width={controlRefs.current[draggingControl.id]?.getBoundingClientRect().width}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </EuiFlexItem>

        {!isViewMode ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={atMaxControls ? ADD_CONTROLS_MAX_LIMIT : ADD_CONTROLS}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  size="s"
                  iconSize="m"
                  display="base"
                  iconType="plusCircle"
                  aria-label={atMaxControls ? ADD_CONTROLS_MAX_LIMIT : ADD_CONTROLS}
                  disabled={atMaxControls}
                  onClick={() => setEditorState({ mode: 'create' })}
                  data-test-subj="eaFaceliftFilterGroupAdd"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                aria-label={PENDING_CHANGES_REMINDER}
                button={
                  <EuiToolTip content={SAVE_CHANGES} disableScreenReaderOutput>
                    <EuiButtonIcon
                      aria-label={SAVE_CHANGES}
                      size="s"
                      iconSize="m"
                      display="base"
                      color="primary"
                      iconType="save"
                      disabled={!hasPendingChanges}
                      onClick={saveChanges}
                      onFocus={() => setPendingPopoverOpen(hasPendingChanges)}
                      onBlur={() => setPendingPopoverOpen(false)}
                      onMouseOver={() => setPendingPopoverOpen(hasPendingChanges)}
                      onMouseOut={() => setPendingPopoverOpen(false)}
                      data-test-subj="eaFaceliftFilterGroupSave"
                    />
                  </EuiToolTip>
                }
                isOpen={pendingPopoverOpen && hasPendingChanges}
                closePopover={() => setPendingPopoverOpen(false)}
                anchorPosition="upCenter"
                panelPaddingSize="none"
                panelProps={{ 'data-test-subj': 'eaFaceliftFilterGroupSavePopover' }}
              >
                <div
                  css={css`
                    max-inline-size: 200px;
                  `}
                >
                  <KbnWarningCallout announceOnMount title={PENDING_CHANGES_REMINDER} size="s" />
                </div>
              </EuiPopover>
            </EuiFlexItem>
          </>
        ) : null}

        <EuiFlexItem grow={false}>
          <FilterGroupMenu
            isViewMode={isViewMode}
            onReset={resetControls}
            onEdit={switchToEditMode}
            onDiscard={discardChanges}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isEditorOpen ? (
        <FilterControlEditor
          initialDraft={editorInitialDraft}
          onSave={onEditorSave}
          onClose={() => setEditorState({ mode: 'closed' })}
        />
      ) : null}
    </>
  );
};
