/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';

export interface BriefNavItem {
  /** DOM id of the section the entry scrolls to. */
  id: string;
  label: string;
}

/** Tracks which section is nearest the top of the viewport while the body scrolls. */
const useActiveSection = (ids: readonly string[]): string | undefined => {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) visible.add(target.id);
          else visible.delete(target.id);
        });
        const first = key.split('|').find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-15% 0px -65% 0px' }
    );
    key
      .split('|')
      .map((id) => document.getElementById(id))
      .forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [key]);

  return active;
};

/** Compact "jump to" tabs: click scrolls the flyout body to the section; the active one follows scroll. */
export const BriefJumpNav: React.FC<{ items: readonly BriefNavItem[] }> = ({ items }) => {
  const active = useActiveSection(items.map(({ id }) => id));
  const [clicked, setClicked] = useState<string | undefined>();

  return (
    <EuiTabs size="s" bottomBorder={false} data-test-subj="executiveBriefJumpNav">
      {items.map(({ id, label }) => (
        <EuiTab
          key={id}
          isSelected={(clicked ?? active) === id}
          onClick={() => {
            setClicked(id);
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => setClicked(undefined), 800);
          }}
          data-test-subj={`executiveBriefJumpNav-${id}`}
        >
          {label}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
