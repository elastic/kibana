/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
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
} from '@elastic/eui';
import type { RuleLibraryListItem, RuleLibraryRefreshStatus } from '../types';
import * as i18n from '../translations';

const STATUS_COLOR: Record<RuleLibraryRefreshStatus, string> = {
  never_refreshed: 'subdued',
  refreshed: 'success',
  refreshing: 'primary',
  refresh_failed: 'danger',
};

export const ALL_LIBRARIES_ID = 'all';

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
                  <EuiHealth color={STATUS_COLOR[library.refreshStatus]} textSize="xs">
                    {library.version
                      ? i18n.LIBRARY_ROW_META(library.provider, library.version)
                      : i18n.LIBRARY_ROW_META_NEVER_REFRESHED(library.provider)}
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

interface LibrariesListProps {
  libraries: readonly RuleLibraryListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const LibrariesList = ({ libraries, selectedId, onSelect }: LibrariesListProps) => {
  const totalRules = libraries.reduce((total, { ruleCount }) => total + ruleCount, 0);

  return (
    <nav aria-label={i18n.LIBRARIES_LIST_ARIA_LABEL} data-test-subj="ruleLibrariesList">
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
        heading={i18n.GROUP_CUSTOM}
        libraries={libraries.filter(({ group }) => group === 'custom')}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </nav>
  );
};
