/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEventHandler, MouseEvent, ReactNode } from 'react';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeaderView } from '@kbn/app-header';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/app-menu';
import { PageLayout } from './page_layout';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { PageOverlay } from '../../../../page_overlay/page_overlay';
import { useUnmanagedFlyoutZIndex } from '../../../../../../common/hooks/use_unmanaged_flyout_z_index';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useAddIntegrationsMenuItem } from '../../../../../../common/components/app_header/use_add_integrations_menu_item';
import { useRouteSpy } from '../../../../../../common/utils/route/use_route_spy';
import { useGetLinkInfo } from '../../../../../../common/links';

/**
 * Id used to register the console overlay with EUI's flyout manager. The console is a singleton, so
 * this only needs to be stable.
 */
const CONSOLE_OVERLAY_UNMANAGED_FLYOUT_ID = 'security-solution-console-overlay';

const BACK_FALLBACK_LABEL = i18n.translate(
  'xpack.securitySolution.consolePageOverlay.header.backFallbackLabel',
  {
    defaultMessage: 'the previous page',
  }
);

export interface ConsolePageOverlayProps {
  console: ReactNode;
  isHidden: boolean;
  onHide: () => void;
  /** Plain-string title rendered by the overlay's `AppHeaderView`. */
  pageTitle?: string;
  /** Rendered below the header, above the console (eg. host banners/callouts). */
  body?: ReactNode;
  /** Structured app menu config contributed by the registrant (eg. "Response actions history"). */
  menu?: AppMenuConfig;
}

/**
 * Resolves the console overlay's back target: the URL of the page the console was opened over (so
 * the back button literally navigates back to it, like any other link), and - best effort - a label
 * naming that page.
 *
 * The href is the real browser URL (not the Security app's router-relative pathname), captured once
 * when the overlay is shown, which already includes whatever base path/app segment the current page
 * lives under - whether that's the Security app or another app such as Discover.
 *
 * The label is resolved through the Security link registry for the page the console was opened from
 * (works for any page: Endpoints, Alerts, Cases, etc., via `useRouteSpy()` + `useGetLinkInfo()`).
 * Both degrade safely to generic defaults outside the Security app's own router (eg. a Discover
 * doc-viewer flyout), in which case this falls back to a generic label that still reads well as
 * "Back to {label}".
 */
const useConsoleOverlayBackTarget = (
  onBack: () => void
): { href: string; label: string; onClick: (ev: MouseEvent) => void } => {
  const [{ pageName }] = useRouteSpy();
  const getLinkInfo = useGetLinkInfo();

  const label = useMemo(
    () => getLinkInfo(pageName)?.title ?? BACK_FALLBACK_LABEL,
    [getLinkInfo, pageName]
  );

  // Captured once, on mount: `ConsolePageOverlay` is only ever mounted while its console is the
  // visible one (see `ConsoleManager`), so this is the URL of the page the console was opened over.
  const href = useMemo(
    () => `${window.location.pathname}${window.location.search}${window.location.hash}`,
    []
  );

  const onClick = useCallback(
    (ev: MouseEvent) => {
      ev.preventDefault();
      onBack();
    },
    [onBack]
  );

  return { href, label, onClick };
};

export const ConsolePageOverlay = memo<ConsolePageOverlayProps>(
  ({ console, onHide, isHidden, body, pageTitle, menu }) => {
    const getTestId = useTestIdGenerator('consolePageOverlay');
    const { services } = useKibana();
    const addIntegrationsMenuItem = useAddIntegrationsMenuItem();
    const back = useConsoleOverlayBackTarget(onHide);
    const rootRef = useRef<HTMLDivElement>(null);

    // Keep `Escape` pressed on the overlay's own controls (header and console) from reaching
    // `PageOverlay`'s document listener, which would hide the whole console. Portaled UI (popovers,
    // flyouts) is outside `rootRef` and handles `Escape` itself.
    const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>((event) => {
      if (event.key === 'Escape' && rootRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, []);

    // When the new flyout system is enabled, slot the overlay into EUI's shared flyout z-index
    // sequence so it renders above whatever flyout it was opened from, and below anything opened on
    // top of it (eg the response actions history flyout). Returns `undefined` for the legacy
    // expandable flyout, in which case `PageOverlay` falls back to its static z-index.
    const dynamicZIndex = useUnmanagedFlyoutZIndex({
      id: CONSOLE_OVERLAY_UNMANAGED_FLYOUT_ID,
      active: !isHidden,
    });

    const headerMenu = useMemo<AppMenuConfig>(() => {
      const items: AppMenuItemType[] = [...(menu?.items ?? [])];

      if (addIntegrationsMenuItem) {
        items.push(addIntegrationsMenuItem);
      }

      return {
        ...menu,
        items,
      };
    }, [menu, addIntegrationsMenuItem]);

    return (
      <PageOverlay
        isHidden={isHidden}
        data-test-subj="consolePageOverlay"
        onHide={onHide}
        enableScrolling={false}
        zIndex={dynamicZIndex}
      >
        <EuiFlexGroup
          direction="column"
          responsive={false}
          gutterSize="none"
          style={{ height: '100%' }}
          data-test-subj={getTestId('root')}
          ref={rootRef}
          onKeyDown={handleKeyDown}
        >
          {!isHidden && (
            <EuiFlexItem grow={false} data-test-subj={getTestId('headerContainer')}>
              {/*
                Deliberately `AppHeaderView`, not `AppHeader`: the console overlays a page that
                already renders its own inline `AppHeader`. `AppHeader` claims the chrome-owned
                inline-header slot (`chrome.inlineAppHeader`), which is last-owner-wins - a second
                claim here would silently take over that slot, and since this overlay unmounts on
                hide, its `unregister()` would then clear the slot entirely, leaving the underlying
                page's still-mounted `AppHeader` registration orphaned (see
                `useInlineAppHeader`/`chrome_api.tsx`). `AppHeaderView` never claims that slot, so
                closing the console cannot affect the page underneath.

                The header is rendered outside `PageLayout`'s padded panel (no `spacing` - it owns
                its own standard inset) per the `@kbn/app-header` README's preferred layout; the
                console's own content keeps its 24px inset via `PageLayout`'s panel below.
              */}
              <AppHeaderView
                title={pageTitle}
                back={back}
                menu={headerMenu}
                docLink={services.docLinks.links.securitySolution.responseActions}
              />
            </EuiFlexItem>
          )}

          <EuiFlexItem grow style={{ minHeight: 0 }}>
            <PageLayout pageBody={body} data-test-subj={getTestId('layout')}>
              {console}
            </PageLayout>
          </EuiFlexItem>
        </EuiFlexGroup>
      </PageOverlay>
    );
  }
);
ConsolePageOverlay.displayName = 'ConsolePageOverlay';
