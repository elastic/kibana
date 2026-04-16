/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { TAGS_SECTION } from './translations';
import { getEntityIcon, MAX_VISIBLE_TAGS } from './utils';

export const renderTextWithEntities = (
  text: string,
  entities: Array<{ type: string; name: string }>
): React.ReactNode => {
  if (!entities.length) return text;

  interface Match {
    start: number;
    end: number;
    entity: { type: string; name: string };
  }
  const matches: Match[] = [];

  for (const entity of entities) {
    const typeLabel = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
    const withPrefix = `${typeLabel} ${entity.name}`;
    let idx = text.indexOf(withPrefix);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + withPrefix.length, entity });
    } else {
      idx = text.indexOf(entity.name);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + entity.name.length, entity });
      }
    }
  }

  if (!matches.length) return text;

  matches.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start >= lastEnd) {
      if (match.start > lastEnd) {
        parts.push(text.slice(lastEnd, match.start));
      }
      parts.push(
        <EuiBadge color="hollow" key={`entity-${match.start}`}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
            <EuiIcon type={getEntityIcon(match.entity.type)} size="s" aria-hidden={true} />
            <span>{match.entity.name}</span>
          </EuiFlexGroup>
        </EuiBadge>
      );
      lastEnd = match.end;
    }
  }

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <>{parts}</>;
};

export const TagsPopover: React.FC<{ tags: string[] }> = ({ tags }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const open = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 100);
  }, []);

  const hiddenTags = tags.slice(MAX_VISIBLE_TAGS);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      ownFocus={false}
      aria-label={TAGS_SECTION}
      button={
        <span
          role="button"
          tabIndex={0}
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }
          }}
        >
          <EuiBadge color="hollow">{`+${hiddenTags.length}`}</EuiBadge>
        </span>
      }
    >
      <div onMouseEnter={open} onMouseLeave={scheduleClose} style={{ maxWidth: 320 }}>
        <EuiText size="xs">
          <strong>{TAGS_SECTION}</strong>
        </EuiText>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {hiddenTags.map((tag) => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
