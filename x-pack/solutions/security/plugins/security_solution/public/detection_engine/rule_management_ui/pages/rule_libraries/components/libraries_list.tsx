/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { RuleLibraryListItem, RuleLibrarySyncStatus } from '../types';
import * as i18n from '../translations';

const STATUS_COLOR: Record<RuleLibrarySyncStatus, string> = {
  never_synced: 'subdued',
  synced: 'success',
  syncing: 'primary',
  sync_failed: 'danger',
};

export const ALL_LIBRARIES_ID = 'all';

export const getLibrariesListWidth = (
  { base, size }: { base: number; size: { xxl: string } },
  isCollapsed: boolean
): string | number => (isCollapsed ? size.xxl : base * 18);

const getRowMeta = ({ provider, version, syncStatus }: RuleLibraryListItem): string => {
  if (syncStatus === 'syncing') return i18n.LIBRARY_ROW_META_SYNCING(provider);
  return version
    ? i18n.LIBRARY_ROW_META(provider, version)
    : i18n.LIBRARY_ROW_META_NEVER_SYNCED(provider);
};

interface LibraryRowLabelProps {
  title: string;
  count?: number;
  meta?: React.ReactNode;
}

const LibraryRowLabel = ({ title, count, meta }: LibraryRowLabelProps) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem className="eui-textTruncate">
      <EuiText size="s" className="eui-textTruncate">
        <strong>{title}</strong>
      </EuiText>
      {meta}
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {count === undefined ? null : (
        <EuiNotificationBadge color="subdued">{count.toLocaleString()}</EuiNotificationBadge>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface LibraryGroupProps {
  heading: string;
  libraries: readonly RuleLibraryListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const LibraryGroup = ({ heading, libraries, selectedId, onSelect }: LibraryGroupProps) => {
  if (libraries.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxxs">
        <h3>{heading}</h3>
      </EuiTitle>
      <EuiListGroup>
        {libraries.map((library) => (
          <EuiListGroupItem
            key={library.id}
            isActive={selectedId === library.id}
            onClick={() => onSelect(library.id)}
            icon={<EuiIcon type={library.icon} size="l" aria-hidden={true} />}
            label={
              <LibraryRowLabel
                title={library.title}
                count={library.version ? library.ruleCount : undefined}
                meta={
                  <EuiHealth color={STATUS_COLOR[library.syncStatus]} textSize="xs">
                    {getRowMeta(library)}
                  </EuiHealth>
                }
              />
            }
            data-test-subj={`ruleLibraryListItem-${library.id}`}
          />
        ))}
      </EuiListGroup>
    </>
  );
};

interface CollapseToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const CollapseToggle = ({ isCollapsed, onToggle }: CollapseToggleProps) => {
  const label = isCollapsed ? i18n.EXPAND_LIBRARIES_LIST : i18n.COLLAPSE_LIBRARIES_LIST;

  return (
    <EuiToolTip content={label} position="right" disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={isCollapsed ? 'menuRight' : 'menuLeft'}
        color="text"
        aria-label={label}
        aria-expanded={!isCollapsed}
        onClick={onToggle}
        data-test-subj="ruleLibrariesListToggle"
      />
    </EuiToolTip>
  );
};

interface LibraryRailButtonProps {
  title: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  testSubj: string;
}

const LibraryRailButton = ({
  title,
  icon,
  isActive,
  onClick,
  testSubj,
}: LibraryRailButtonProps) => (
  <EuiToolTip content={title} position="right" disableScreenReaderOutput>
    <EuiButtonIcon
      iconType={icon}
      size="m"
      display={isActive ? 'fill' : 'empty'}
      color={isActive ? 'primary' : 'text'}
      aria-label={title}
      aria-pressed={isActive}
      onClick={onClick}
      data-test-subj={testSubj}
    />
  </EuiToolTip>
);

interface LibrariesListProps {
  libraries: readonly RuleLibraryListItem[];
  selectedId: string;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
}

export const LibrariesList = ({
  libraries,
  selectedId,
  isCollapsed,
  onToggleCollapsed,
  onSelect,
}: LibrariesListProps) => {
  const totalRules = libraries.reduce((total, { ruleCount }) => total + ruleCount, 0);

  if (isCollapsed) {
    return (
      <nav aria-label={i18n.LIBRARIES_LIST_ARIA_LABEL} data-test-subj="ruleLibrariesList">
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <CollapseToggle isCollapsed onToggle={onToggleCollapsed} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LibraryRailButton
              title={i18n.ALL_LIBRARIES}
              icon="grid"
              isActive={selectedId === ALL_LIBRARIES_ID}
              onClick={() => onSelect(ALL_LIBRARIES_ID)}
              testSubj="ruleLibraryListItem-all"
            />
          </EuiFlexItem>
          {libraries.map((library) => (
            <EuiFlexItem grow={false} key={library.id}>
              <LibraryRailButton
                title={library.title}
                icon={library.icon}
                isActive={selectedId === library.id}
                onClick={() => onSelect(library.id)}
                testSubj={`ruleLibraryListItem-${library.id}`}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </nav>
    );
  }

  return (
    <nav aria-label={i18n.LIBRARIES_LIST_ARIA_LABEL} data-test-subj="ruleLibrariesList">
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <CollapseToggle isCollapsed={false} onToggle={onToggleCollapsed} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiListGroup>
        <EuiListGroupItem
          isActive={selectedId === ALL_LIBRARIES_ID}
          onClick={() => onSelect(ALL_LIBRARIES_ID)}
          icon={<EuiIcon type="grid" size="l" aria-hidden={true} />}
          label={<LibraryRowLabel title={i18n.ALL_LIBRARIES} count={totalRules} />}
          data-test-subj="ruleLibraryListItem-all"
        />
      </EuiListGroup>
      <LibraryGroup
        heading={i18n.GROUP_ELASTIC}
        libraries={libraries.filter(({ group }) => group === 'elastic')}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <LibraryGroup
        heading={i18n.GROUP_CUSTOM_SHARED}
        libraries={libraries.filter(({ group, scope }) => group === 'custom' && scope === 'shared')}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <LibraryGroup
        heading={i18n.GROUP_CUSTOM}
        libraries={libraries.filter(({ group, scope }) => group === 'custom' && scope === 'space')}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </nav>
  );
};
