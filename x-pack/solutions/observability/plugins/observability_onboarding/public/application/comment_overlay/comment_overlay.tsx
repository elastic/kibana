/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useSyncExternalStore,
} from 'react';
import ReactDOM from 'react-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  CANCEL_BUTTON,
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import {
  ACTIVATE_ANNOTATION_MODE_EVENT,
  PROMPT_REMOVE_ALL_ANNOTATIONS_EVENT,
  annotationCanvasVisibility,
} from '../onboarding_annotation_chrome_store';
import { isEditableKeyboardTarget, isPrimaryModifier } from '../onboarding_shortcut_helpers';

const SO_TYPE = 'observability-onboarding-ui-comment';
/** Bumped when the stored name shape or policy changes; legacy keys are removed on mount. */
const IDENTITY_KEY = 'kibana_ui_commenter_name_v3';
const LEGACY_IDENTITY_KEYS = ['kibana_ui_commenter_name', 'kibana_ui_commenter_name_v2'] as const;
/** Set `localStorage.setItem('obsOnboardingDebugAnnotations','1')` and reload to log resolve/render state. */
const DEBUG_ANNOTATIONS_KEY = 'obsOnboardingDebugAnnotations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface Annotation {
  id: string;
  pageX: number; // page X of element top-left corner
  pageY: number; // page Y of element top-left corner
  elemWidth: number;
  elemHeight: number;
  selector: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  /** Saved while target was inside a flyout/modal — hide when that shell is not open. */
  floatingAnchor: boolean;
  /** Route where the annotation was created (empty = legacy, treated as current page). */
  pathname: string;
}

interface PageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SavedObjectAttributes {
  clientX: number;
  clientY: number;
  elemWidth: number;
  elemHeight: number;
  selector: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  pathname: string;
  floatingAnchor?: boolean;
}

interface HttpService {
  get: <T>(path: string, options?: { query?: Record<string, unknown> }) => Promise<T>;
  post: <T>(path: string, options?: { body?: string }) => Promise<T>;
  put: <T>(path: string, options?: { body?: string }) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const safeQuerySelectorAll = (selector: string): Element[] => {
  const trimmed = selector.trim();
  if (!trimmed) return [];
  try {
    return Array.from(document.querySelectorAll(trimmed));
  } catch {
    return [];
  }
};

/**
 * Floating UI participates in stacking even at opacity 0 during open animations.
 * Only treat display/visibility and zero layout size as non-present.
 */
const isFloatingUiPresentForStacking = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.getClientRects().length > 0;
};

/**
 * Whether a flyout/modal shell can host resolved targets for badges.
 * Do not use `visibility: hidden` here — EUI can use it during transitions while the panel is still
 * the correct anchor; that would hide every flyout comment from `visibleAnnotations`.
 */
const isFloatingShellRenderableForBadges = (shell: HTMLElement): boolean => {
  if (!shell.getClientRects().length) return false;
  const style = getComputedStyle(shell);
  if (style.display === 'none') return false;
  return true;
};

/** Saved selector is relative to `.euiFlyout` / `.euiModal` so it cannot match duplicate copy on the page. */
const FLOATING_RELATIVE_PREFIX = '[[obsOnboardingFlyout]]';

const isFloatingScopedSelector = (selector: string): boolean =>
  selector.trimStart().startsWith(FLOATING_RELATIVE_PREFIX);

/** Flyout Endpoint / API key `EuiCodeBlock` inner `code` `data-test-subj` prefix (stable anchor). */
const FLYOUT_ONBOARDING_CODE_BLOCK_SUBJ_PREFIX = 'observabilityOnboardingFlyoutCodeBlock';

const getFloatingScopedInner = (selector: string): string =>
  selector.trimStart().slice(FLOATING_RELATIVE_PREFIX.length);

const safeQuerySelectorAllWithinShell = (shell: Element, selector: string): Element[] => {
  const trimmed = selector.trim();
  if (!trimmed) return [];
  try {
    return Array.from(shell.querySelectorAll(trimmed));
  } catch {
    return [];
  }
};

const FLYOUT_MODAL_SHELL_SELECTOR = '.euiFlyout, .euiModal';

const shellIsSearchableForScopedSelector = (shell: HTMLElement): boolean => {
  if (!isFloatingShellRenderableForBadges(shell)) return false;
  const style = getComputedStyle(shell);
  const opacity = parseFloat(style.opacity);
  // Exclude only effectively invisible shells; 0.02 was too aggressive and skipped flyouts
  // during EUI open transitions so scoped selectors never resolved and badges never appeared.
  if (!Number.isNaN(opacity) && opacity < 0.001) return false;
  return true;
};

const collectFloatingScopedMatches = (inner: string): Element[] => {
  const trimmed = inner.trim();
  if (!trimmed) return [];
  const shells = Array.from(document.querySelectorAll(FLYOUT_MODAL_SHELL_SELECTOR)).filter(
    (n): n is HTMLElement => n instanceof HTMLElement
  );

  // Prefer shells EUI considers “present”, and ignore opacity-0 shells (closed flyouts often stay
  // mounted during exit animations and would still match scoped selectors).
  const stackingVisibleShells = shells.filter(
    (shell) => isFloatingUiPresentForStacking(shell) && shellIsSearchableForScopedSelector(shell)
  );
  let shellsToSearch =
    stackingVisibleShells.length > 0
      ? stackingVisibleShells
      : shells.filter((shell) => shellIsSearchableForScopedSelector(shell));

  if (shellsToSearch.length === 0) {
    shellsToSearch = shells.filter((s) => isFloatingShellRenderableForBadges(s));
  }

  const out: Element[] = [];
  for (const shell of shellsToSearch) {
    out.push(...safeQuerySelectorAllWithinShell(shell, trimmed));
  }
  // Stacking/opacity filters can skip every shell while the flyout is still on-screen; retry any
  // renderable shell so scoped selectors keep resolving (not only Endpoint code blocks).
  if (out.length === 0) {
    const relaxedShells = shells.filter((s) => isFloatingShellRenderableForBadges(s));
    for (const shell of relaxedShells) {
      out.push(...safeQuerySelectorAllWithinShell(shell, trimmed));
    }
  }
  return out;
};

const resolveAnnotationElements = (selector: string): Element[] => {
  const trimmed = selector.trim();
  if (!trimmed) return [];
  if (isFloatingScopedSelector(trimmed)) {
    return collectFloatingScopedMatches(getFloatingScopedInner(trimmed));
  }
  return safeQuerySelectorAll(trimmed);
};

const pickClosestElementToRect = (matches: Element[], fallback: PageRect): Element => {
  if (matches.length === 1) return matches[0];
  const fcx = fallback.x + fallback.width / 2;
  const fcy = fallback.y + fallback.height / 2;
  let best = matches[0];
  let bestDist = Infinity;
  for (const candidate of matches) {
    const r = candidate.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = (cx - fcx) ** 2 + (cy - fcy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
};

const stampedFlyoutCodeBlockSelector = `code[data-test-subj^="${FLYOUT_ONBOARDING_CODE_BLOCK_SUBJ_PREFIX}"]`;

/** `EuiCodeBlock` stamps `data-test-subj` on the inner `code`; hits / selectors may resolve to `pre`. */
const isStampedFlyoutCodeBlock = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  try {
    if (el.matches(stampedFlyoutCodeBlockSelector)) return true;
  } catch {
    return false;
  }
  if (el.matches('pre.euiCodeBlock__pre')) {
    return Boolean(el.querySelector(stampedFlyoutCodeBlockSelector));
  }
  return false;
};

/**
 * When multiple nodes match a scoped query (e.g. two flyout shells during transitions),
 * prefer stamped Endpoint/API key `code` nodes — otherwise `pickClosest` can attach badges to
 * a nearby paragraph or link even when the saved selector targets the code block.
 */
const pickScopedFloatingMatch = (matches: Element[], fallback: PageRect): Element => {
  if (matches.length === 1) return matches[0];
  const stamped = matches.filter(
    (m): m is HTMLElement => m instanceof HTMLElement && isStampedFlyoutCodeBlock(m)
  );
  if (stamped.length === 1) {
    return stamped[0];
  }
  const fcx = fallback.x + fallback.width / 2;
  const fcy = fallback.y + fallback.height / 2;
  for (const m of stamped) {
    const r = m.getBoundingClientRect();
    if (fcx >= r.left && fcx <= r.right && fcy >= r.top && fcy <= r.bottom) {
      return m;
    }
  }
  if (stamped.length > 1) {
    return pickClosestElementToRect(stamped, fallback);
  }
  return pickClosestElementToRect(matches, fallback);
};

/** Viewport-space rect matching how we persist clientX/clientY for resolve / disambiguation. */
const getAnnotationViewportFallbackRect = (ann: Annotation): PageRect => {
  const scrollTop = document.getElementById('app-main-scroll')?.scrollTop ?? 0;
  const useViewportY = ann.floatingAnchor || isFloatingScopedSelector(ann.selector);
  return {
    x: ann.pageX,
    y: useViewportY ? ann.pageY : ann.pageY - scrollTop,
    width: ann.elemWidth,
    height: ann.elemHeight,
  };
};

const resolveAnnotationTarget = (
  selector: string,
  viewportFallback?: PageRect | null
): Element | null => {
  const matches = resolveAnnotationElements(selector);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  if (viewportFallback && isFloatingScopedSelector(selector)) {
    return pickScopedFloatingMatch(matches, viewportFallback);
  }
  if (viewportFallback) return pickClosestElementToRect(matches, viewportFallback);
  return matches[0];
};

const soToAnnotation = (so: { id: string; attributes: SavedObjectAttributes }): Annotation => {
  const selector = so.attributes.selector ?? '';
  return {
    id: so.id,
    pageX: so.attributes.clientX,
    pageY: so.attributes.clientY,
    elemWidth: so.attributes.elemWidth ?? 100,
    elemHeight: so.attributes.elemHeight ?? 40,
    selector,
    text: so.attributes.text,
    author: so.attributes.author,
    createdAt: so.attributes.createdAt,
    resolved: so.attributes.resolved,
    replies: so.attributes.replies ?? [],
    floatingAnchor: so.attributes.floatingAnchor === true || isFloatingScopedSelector(selector),
    pathname: so.attributes.pathname ?? '',
  };
};

/** Walk up from the target to find a meaningful, annotatable element. */
const MEANINGFUL_TAGS = new Set(['button', 'input', 'select', 'textarea', 'a', 'img', 'video']);
const MEANINGFUL_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'menuitem',
  'tab',
  'combobox',
  'searchbox',
  'textbox',
  'dialog',
  'navigation',
]);

const FLYOUT_TEXT_TAGS = new Set([
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'li',
  'dt',
  'dd',
  'figcaption',
  'strong',
  'em',
  'code',
  /** EuiCodeBlock wraps content in `pre` > `code`; hits often land on `pre` padding. */
  'pre',
]);

/** In flyouts, `width >= 80` on these often grabs a full-width layout row instead of the real control. */
const FLYOUT_LAYOUT_BLOCK_TAGS = new Set([
  'div',
  'section',
  'main',
  'header',
  'footer',
  'article',
  'form',
  'aside',
]);

/**
 * EUI flyout/modal shells expose `data-test-subj` on scroll/layout nodes (e.g. `euiFlyoutBody__overflow`).
 * Those nodes match `isFlyoutSemanticCandidate` via `data-test-subj` and steal hits from real content;
 * saving them yields a huge rect so geometry checks hide the annotation.
 */
const isFlyoutModalAnnotationChrome = (node: Element): boolean => {
  if (!(node instanceof HTMLElement)) return false;
  if (node.classList.contains('euiFlyout') || node.classList.contains('euiModal')) return true;
  const subj = node.getAttribute('data-test-subj');
  if (!subj) return false;
  return (
    subj === 'euiFlyoutBody' ||
    subj.startsWith('euiFlyoutBody__') ||
    subj === 'euiModalBody' ||
    subj.startsWith('euiModalBody__') ||
    subj.startsWith('euiFlyoutHeader') ||
    subj.startsWith('euiFlyoutFooter')
  );
};

const isFlyoutSemanticCandidate = (node: Element, inFloating: boolean): boolean => {
  if (node.hasAttribute('data-annotation-overlay')) return false;
  if (inFloating && isFlyoutModalAnnotationChrome(node)) return false;
  const rect = node.getBoundingClientRect();
  const tag = node.tagName.toLowerCase();
  const role = node.getAttribute('role') ?? '';
  if (inFloating && role === 'dialog' && typeof window !== 'undefined') {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.width * rect.height > vw * vh * 0.18) return false;
  }
  const minW = inFloating ? 8 : 20;
  const minH = inFloating ? 8 : 16;
  const isBigEnough = rect.width >= minW && rect.height >= minH;
  const hasFlyoutText =
    inFloating &&
    FLYOUT_TEXT_TAGS.has(tag) &&
    (node.textContent?.replace(/\s+/g, ' ').trim().length ?? 0) >= 3;
  const wideRowSemantic =
    rect.width >= 80 &&
    (!inFloating ||
      !FLYOUT_LAYOUT_BLOCK_TAGS.has(tag) ||
      node.hasAttribute('data-test-subj') ||
      MEANINGFUL_TAGS.has(tag) ||
      MEANINGFUL_ROLES.has(role));
  const isSemanticEl =
    MEANINGFUL_TAGS.has(tag) ||
    MEANINGFUL_ROLES.has(role) ||
    node.hasAttribute('data-test-subj') ||
    wideRowSemantic ||
    hasFlyoutText;
  return isBigEnough && isSemanticEl;
};

const FLYOUT_INTERACTIVE_SELECTOR = [
  'input:not([type="hidden"])',
  'textarea',
  'button:not([type="hidden"])',
  'select',
  'a[href]',
  '[contenteditable="true"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="button"]',
  '[role="link"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
].join(', ');

/** Padding expands hit testing for EUI control chrome around inputs/buttons. */
const pointInsideRectSloppy = (x: number, y: number, r: DOMRect, pad: number): boolean =>
  x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;

/**
 * Clicks land on EUI wrappers. Prefer real controls (input, tab, …) from the hit stack, then text.
 */
const preferFlyoutElementFromPoint = (clientX: number, clientY: number): Element | null => {
  const stack = document.elementsFromPoint(clientX, clientY);
  const semanticCandidates: Element[] = [];
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    if (node.hasAttribute('data-annotation-overlay')) continue;
    const shell = node.closest('.euiFlyout') ?? node.closest('.euiModal');
    if (!shell) continue;
    if (isFlyoutModalAnnotationChrome(node)) continue;
    let isInteractive = false;
    try {
      isInteractive = node.matches(FLYOUT_INTERACTIVE_SELECTOR);
    } catch {
      isInteractive = false;
    }
    if (isInteractive) {
      const r = node.getBoundingClientRect();
      if (pointInsideRectSloppy(clientX, clientY, r, 6)) return node;
    }
    if (node instanceof HTMLElement) {
      const stampedCode = node.matches(
        `code[data-test-subj^="${FLYOUT_ONBOARDING_CODE_BLOCK_SUBJ_PREFIX}"]`
      )
        ? node
        : node.closest(`code[data-test-subj^="${FLYOUT_ONBOARDING_CODE_BLOCK_SUBJ_PREFIX}"]`);
      if (stampedCode instanceof HTMLElement && shell.contains(stampedCode)) {
        const stampedRect = stampedCode.getBoundingClientRect();
        if (pointInsideRectSloppy(clientX, clientY, stampedRect, 6)) {
          return stampedCode;
        }
      }
    }
    if (!isFlyoutSemanticCandidate(node, true)) continue;
    const cr = node.getBoundingClientRect();
    if (!pointInsideRectSloppy(clientX, clientY, cr, 6)) continue;
    semanticCandidates.push(node);
  }
  if (semanticCandidates.length === 0) return null;
  let best = semanticCandidates[0];
  let bestArea = best.getBoundingClientRect().width * best.getBoundingClientRect().height;
  for (let i = 1; i < semanticCandidates.length; i++) {
    const c = semanticCandidates[i];
    const r = c.getBoundingClientRect();
    const area = r.width * r.height;
    if (area < bestArea) {
      best = c;
      bestArea = area;
    }
  }
  return best;
};

const findAnnotatableElement = (
  target: EventTarget | null,
  clientX?: number,
  clientY?: number
): Element | null => {
  if (clientX != null && clientY != null) {
    const fromStack = preferFlyoutElementFromPoint(clientX, clientY);
    if (fromStack) return fromStack;
  }

  let el = target as Element | null;
  while (el && el !== document.body) {
    if (el.hasAttribute('data-annotation-overlay')) return null;
    const inFloating = Boolean(el.closest('.euiFlyout') || el.closest('.euiModal'));
    if (inFloating && isFlyoutModalAnnotationChrome(el)) {
      el = el.parentElement;
      continue;
    }
    if (isFlyoutSemanticCandidate(el, inFloating)) return el;
    el = el.parentElement;
  }
  return null;
};

/** Generate a stable CSS selector for an element, prioritising Kibana-specific attributes. */
const generateSelector = (el: Element): string => {
  const parts: string[] = [];
  let current: Element | null = el;
  const anchorInFloating = Boolean(el.closest('.euiFlyout') || el.closest('.euiModal'));
  while (current && current !== document.body) {
    if (current.id && !/^\d/.test(current.id) && !current.id.startsWith('css-')) {
      parts.unshift(`#${current.id}`);
      break;
    }
    const testSubj = current.getAttribute('data-test-subj');
    if (testSubj) {
      // Avoid invalid selectors when values contain quotes, commas, etc.
      if (!/["#[\\],]/.test(testSubj)) {
        const subjSel = `[data-test-subj="${testSubj}"]`;
        // In flyouts/modals, a short data-test-subj often matches many nodes; querySelector
        // would return the first in DOM (often a wide layout shell), pinning the badge to the wrong edge.
        const ambiguous = anchorInFloating && safeQuerySelectorAll(subjSel).length > 1;
        if (!ambiguous) {
          parts.unshift(subjSel);
          break;
        }
      }
    }
    const tag = current.tagName.toLowerCase();
    const ariaLabel = current.getAttribute('aria-label');
    if (ariaLabel && MEANINGFUL_TAGS.has(tag)) {
      parts.unshift(`${tag}[aria-label="${ariaLabel}"]`);
      break;
    }
    let part = tag;
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = current.parentElement;
    if (parts.length >= 6) break;
  }
  return parts.join(' > ');
};

/** Path from `el` up to (but not including) `shell`, for use with `shell.querySelector(...)`. */
const generateRelativeSelectorWithinShell = (shell: Element, el: Element): string => {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== shell && current !== document.body) {
    if (current.id && !/^\d/.test(current.id) && !current.id.startsWith('css-')) {
      parts.unshift(`#${current.id}`);
      break;
    }
    const testSubj = current.getAttribute('data-test-subj');
    if (testSubj) {
      if (!/["#[\\],]/.test(testSubj)) {
        const subjSel = `[data-test-subj="${testSubj}"]`;
        const ambiguous = safeQuerySelectorAllWithinShell(shell, subjSel).length > 1;
        if (!ambiguous) {
          parts.unshift(subjSel);
          break;
        }
      }
    }
    const tag = current.tagName.toLowerCase();
    const ariaLabel = current.getAttribute('aria-label');
    if (ariaLabel && MEANINGFUL_TAGS.has(tag)) {
      parts.unshift(`${tag}[aria-label="${ariaLabel}"]`);
      break;
    }
    let part = tag;
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = current.parentElement;
    if (parts.length >= 10) break;
  }
  return parts.join(' > ');
};

const generateAnnotationSelector = (el: Element): string => {
  const shell =
    (el.closest('.euiFlyout') as Element | null) ?? (el.closest('.euiModal') as Element | null);
  if (shell) {
    return FLOATING_RELATIVE_PREFIX + generateRelativeSelectorWithinShell(shell, el);
  }
  return generateSelector(el);
};

/** Human-readable label for an element. */
const getElementLabel = (el: Element): string => {
  const testSubj = el.getAttribute('data-test-subj');
  if (testSubj) return testSubj;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  const text = el.textContent?.trim().slice(0, 40);
  if (text) return text;
  return el.tagName.toLowerCase();
};

/** Reject DOM matches that are far from where the annotation was saved (wrong shell / stale node). */
const FLOATING_RESOLVE_MAX_CENTER_DISTANCE_SQ = 340 * 340;

const isFloatingTargetGeometryPlausible = (
  targetRect: { left: number; top: number; width: number; height: number },
  fallback: PageRect
): boolean => {
  const tcx = targetRect.left + targetRect.width / 2;
  const tcy = targetRect.top + targetRect.height / 2;
  const fcx = fallback.x + fallback.width / 2;
  const fcy = fallback.y + fallback.height / 2;
  const ddx = tcx - fcx;
  const ddy = tcy - fcy;
  if (ddx * ddx + ddy * ddy > FLOATING_RESOLVE_MAX_CENTER_DISTANCE_SQ) return false;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const fbArea = Math.max(80, fallback.width * fallback.height);
  const tArea = Math.max(1, targetRect.width * targetRect.height);
  const il = Math.max(targetRect.left, fallback.x);
  const ir = Math.min(targetRect.left + targetRect.width, fallback.x + fallback.width);
  const it = Math.max(targetRect.top, fallback.y);
  const ib = Math.min(targetRect.top + targetRect.height, fallback.y + fallback.height);
  const iw = Math.max(0, ir - il);
  const ih = Math.max(0, ib - it);
  const inter = iw * ih;
  const overlapRatio = inter / fbArea;
  // Reject matches that don’t overlap where the user anchored (stops “nearest” full-width rows).
  if (overlapRatio < 0.08) return false;
  // Flyout `EuiCodeBlock` rows are often full flyout width (>58% vw); only reject “wide + weak overlap”.
  if (targetRect.width > vw * 0.58 && overlapRatio < 0.12) return false;
  const ratio = tArea / fbArea;
  // Saved rect can be a small sub-range of a wide code row; ratio ≫ 1 is expected then.
  if (ratio > 40 && overlapRatio < 0.25) return false;
  if (ratio < 0.02 && tArea > 400) return false;
  return true;
};

/**
 * Try to find an element by its stored selector and return its current VIEWPORT rect.
 * Kibana's scroll container is #app-main-scroll, not window, so window.scrollY is
 * always 0. We use getBoundingClientRect() directly for position: fixed placement.
 */
const resolveElementRect = (selector: string, fallback: PageRect): PageRect => {
  if (!selector) return fallback;
  const matches = resolveAnnotationElements(selector);
  if (matches.length === 0) return fallback;
  const chosen = isFloatingScopedSelector(selector)
    ? pickScopedFloatingMatch(matches, fallback)
    : pickClosestElementToRect(matches, fallback);
  const r = chosen.getBoundingClientRect();
  // Scoped flyout paths pin to live DOM; saved client rects go stale after flyout scroll, so
  // comparing them to `getBoundingClientRect()` hid badges and forced fallback coords off-screen.
  if (isFloatingScopedSelector(selector)) {
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }
  if (
    !isFloatingTargetGeometryPlausible(
      { left: r.left, top: r.top, width: r.width, height: r.height },
      fallback
    )
  ) {
    return fallback;
  }
  return { x: r.left, y: r.top, width: r.width, height: r.height };
};

/**
 * True when the DOM node lives under flyout/modal or (legacy) inside the dimmed overlay mask.
 * Note: overlay flyouts are often **siblings** of `.euiOverlayMask`, not descendants — scoped
 * targets usually only match `.euiFlyout` / `.euiModal`.
 */
const isAnnotationTargetInFloatingLayer = (target: Element | null): boolean => {
  if (!target) return false;
  return Boolean(
    target.closest('.euiFlyout') || target.closest('.euiModal') || target.closest('.euiOverlayMask')
  );
};

/**
 * Flyout/modal anchors use `[[obsOnboardingFlyout]]` + a shell-relative path. When the shell is
 * mid-animation or stacking filters skip it briefly, `resolveAnnotationTarget` can return null
 * even though the click was in a flyout — that must still count as floating so the locked
 * highlight uses the viewport clip layer (not #app-main-scroll) and `floatingAnchor` saves
 * correctly.
 */
const isFloatingAnnotationContext = (selector: string, resolvedTarget: Element | null): boolean =>
  isFloatingScopedSelector(selector) || isAnnotationTargetInFloatingLayer(resolvedTarget);

interface EuiLevelsForStacking {
  readonly mask: number | string;
  readonly flyout: number | string;
  readonly modal: number | string;
}

const toStackingNumber = (value: number | string): number => {
  if (typeof value === 'number') return value;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Lowest z-index among EUI floating UI (overlay masks, flyouts, modals).
 * Uses theme fallbacks when computed z-index is `auto` / NaN (common during transitions).
 */
const getMinFloatingUiZIndex = (levels: EuiLevelsForStacking): number | null => {
  let min = Infinity;
  const consider = (node: Element, fallbackZ: number) => {
    if (!isFloatingUiPresentForStacking(node)) return;
    const raw = getComputedStyle(node as HTMLElement).zIndex;
    const parsed = Number.parseInt(raw, 10);
    const z = !Number.isNaN(parsed) && raw !== 'auto' ? parsed : fallbackZ;
    min = Math.min(min, z);
  };
  const maskZ = toStackingNumber(levels.mask);
  const flyoutZ = toStackingNumber(levels.flyout);
  const modalZ = toStackingNumber(levels.modal);
  document.querySelectorAll('.euiOverlayMask').forEach((n) => consider(n, maskZ));
  document.querySelectorAll('.euiFlyout').forEach((n) => consider(n, flyoutZ));
  document.querySelectorAll('.euiModal').forEach((n) => consider(n, modalZ));
  return min === Infinity ? null : min;
};

/** Highest z-index among floating UI — used to stack seek/hover chrome above flyouts. */
const getMaxFloatingUiZIndex = (levels: EuiLevelsForStacking): number => {
  let max = 0;
  const consider = (node: Element, fallbackZ: number) => {
    if (!isFloatingUiPresentForStacking(node)) return;
    const raw = getComputedStyle(node as HTMLElement).zIndex;
    const parsed = Number.parseInt(raw, 10);
    const z = !Number.isNaN(parsed) && raw !== 'auto' ? parsed : fallbackZ;
    max = Math.max(max, z);
  };
  const maskZ = toStackingNumber(levels.mask);
  const flyoutZ = toStackingNumber(levels.flyout);
  const modalZ = toStackingNumber(levels.modal);
  document.querySelectorAll('.euiOverlayMask').forEach((n) => consider(n, maskZ));
  document.querySelectorAll('.euiFlyout').forEach((n) => consider(n, flyoutZ));
  document.querySelectorAll('.euiModal').forEach((n) => consider(n, modalZ));
  return max;
};

const treatAnnotationAsFloating = (ann: Annotation): boolean =>
  ann.floatingAnchor || isFloatingScopedSelector(ann.selector);

/** Page annotations: optional legacy ghost hide. Floating: hide flyout-scoped rows when the
 * shell/target is absent so we do not paint viewport “ghost” badges on the main page. */
const isAnnotationRenderable = (
  ann: Annotation,
  levels: EuiLevelsForStacking,
  scrollContentRight: number | null
): boolean => {
  const fb = getAnnotationViewportFallbackRect(ann);
  if (!treatAnnotationAsFloating(ann)) {
    if (
      !resolveAnnotationTarget(ann.selector, fb) &&
      getMinFloatingUiZIndex(levels) === null &&
      scrollContentRight !== null &&
      ann.pageX >= scrollContentRight - 8
    ) {
      return false;
    }
    return true;
  }

  const matches = resolveAnnotationElements(ann.selector);
  if (matches.length === 0) {
    return false;
  }
  const target = isFloatingScopedSelector(ann.selector)
    ? pickScopedFloatingMatch(matches, fb)
    : pickClosestElementToRect(matches, fb);

  const flyoutOrModalShell =
    (target.closest('.euiFlyout') as HTMLElement | null) ??
    (target.closest('.euiModal') as HTMLElement | null);

  if (isFloatingScopedSelector(ann.selector)) {
    return Boolean(flyoutOrModalShell && isFloatingShellRenderableForBadges(flyoutOrModalShell));
  }

  if (!isAnnotationTargetInFloatingLayer(target)) return false;
  if (!flyoutOrModalShell || !isFloatingShellRenderableForBadges(flyoutOrModalShell)) return false;

  const r = target.getBoundingClientRect();
  if (!isFloatingTargetGeometryPlausible(r, fb)) return false;
  return true;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const CommentOverlay: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const seekTooltipShadow = useEuiShadow('s', { direction: 'down' });
  const { services } = useKibana<{ http: HttpService }>();

  // Identity
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem(IDENTITY_KEY)
  );
  const [nameInput, setNameInput] = useState('');
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
  const pendingActivation = useRef(false);

  useEffect(() => {
    try {
      for (const key of LEGACY_IDENTITY_KEYS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore private mode / blocked storage
    }
  }, []);

  // Annotation mode
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  // Live hover state (viewport rect — for the highlight box)
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState('');
  const hoveredElRef = useRef<Element | null>(null);
  // Locked element after click
  const [pendingPageRect, setPendingPageRect] = useState<PageRect | null>(null);
  const [pendingSelector, setPendingSelector] = useState('');

  // Ref to the transparent seek overlay so we can toggle pointer-events for elementFromPoint
  const seekOverlayRef = useRef<HTMLDivElement | null>(null);

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newText, setNewText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [removeAllAnnotationsModalOpen, setRemoveAllAnnotationsModalOpen] = useState(false);
  const [removeAllAnnotationsInProgress, setRemoveAllAnnotationsInProgress] = useState(false);

  /** Viewport position of the seek cursor (comment icon pill). */
  const [seekCursor, setSeekCursor] = useState<{ x: number; y: number } | null>(null);
  const seekCursorRafRef = useRef<number | null>(null);
  const seekCursorPendingRef = useRef<{ x: number; y: number } | null>(null);

  const canvasVisible = useSyncExternalStore(
    annotationCanvasVisibility.subscribe,
    annotationCanvasVisibility.getSnapshot,
    annotationCanvasVisibility.getServerSnapshot
  );
  const currentUserRef = useRef<string | null>(currentUser);
  currentUserRef.current = currentUser;

  // Bump to re-merge clip layers / resolve flyout targets (must stay above any useEffect).
  const [overlayEpoch, setOverlayEpoch] = useState(0);

  // Force re-render on scroll so position: fixed badges track the element
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const el = document.getElementById('app-main-scroll');
    if (!el) return;
    const onScroll = () => forceUpdate((n) => n + 1);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const flushSeekCursor = useCallback(() => {
    seekCursorRafRef.current = null;
    const pending = seekCursorPendingRef.current;
    if (pending) {
      setSeekCursor(pending);
    }
  }, []);

  const scheduleSeekCursor = useCallback(
    (clientX: number, clientY: number) => {
      seekCursorPendingRef.current = { x: clientX, y: clientY };
      if (seekCursorRafRef.current === null) {
        seekCursorRafRef.current = window.requestAnimationFrame(flushSeekCursor);
      }
    },
    [flushSeekCursor]
  );

  useEffect(() => {
    if (!canvasVisible || !isAnnotationMode || pendingPageRect) {
      if (seekCursorRafRef.current !== null) {
        window.cancelAnimationFrame(seekCursorRafRef.current);
        seekCursorRafRef.current = null;
      }
      seekCursorPendingRef.current = null;
      setSeekCursor(null);
    }
  }, [canvasVisible, isAnnotationMode, pendingPageRect]);

  // Flyout/modal bodies scroll outside #app-main-scroll; shell-portaled badges need the same tick.
  useEffect(() => {
    const onScrollCapture = (e: Event) => {
      const t = e.target;
      if (
        t instanceof Element &&
        (t.closest('.euiFlyoutBody') ||
          t.closest('.euiFlyoutBody__overflow') ||
          t.closest('.euiFlyoutBody__overflowContent') ||
          t.closest('.euiModalBody'))
      ) {
        forceUpdate((n) => n + 1);
      }
    };
    document.addEventListener('scroll', onScrollCapture, true);
    return () => document.removeEventListener('scroll', onScrollCapture, true);
  }, []);

  // Re-merge stacking when flyouts/modals mount (EUI portals)
  useEffect(() => {
    let rafOuter = 0;
    let rafInner = 0;
    let debounce = 0;
    // Two rAFs: first mutation often fires before React commits flyout body; the next frame
    // usually has `.querySelector` targets available (otherwise badges stay empty until any
    // unrelated state update, e.g. toggling annotation mode).
    const bump = () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      rafOuter = requestAnimationFrame(() => {
        rafInner = requestAnimationFrame(() => {
          setOverlayEpoch((n) => n + 1);
        });
      });
    };
    // MutationObserver alone misses some flyout/session updates; user interaction also needs a bump.
    const scheduleBump = () => {
      clearTimeout(debounce);
      debounce = window.setTimeout(() => bump(), 40);
    };
    const observer = new MutationObserver(bump);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      // Flyouts often toggle visibility via class/style without adding/removing nodes
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'hidden',
        'aria-hidden',
        'data-managed-flyout',
        'data-managed-flyout-level',
      ],
    });
    window.addEventListener('resize', bump);
    window.addEventListener('pointerdown', scheduleBump, true);
    window.addEventListener('focusin', scheduleBump, true);
    document.addEventListener('visibilitychange', scheduleBump);
    return () => {
      clearTimeout(debounce);
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      observer.disconnect();
      window.removeEventListener('resize', bump);
      window.removeEventListener('pointerdown', scheduleBump, true);
      window.removeEventListener('focusin', scheduleBump, true);
      document.removeEventListener('visibilitychange', scheduleBump);
    };
  }, []);

  // Saved-object list changes (load, add, delete) must re-run flyout resolve + clip layers.
  useEffect(() => {
    setOverlayEpoch((n) => n + 1);
  }, [annotations]);

  // Seek overlay / mode chrome changes stacking; re-evaluate when leaving mode too.
  useEffect(() => {
    setOverlayEpoch((n) => n + 1);
  }, [isAnnotationMode]);

  // Popovers for page annotations cannot sit above a blocking layer; close them instead.
  useEffect(() => {
    if (!openAnnotationId) return;
    const ann = annotations.find((a) => a.id === openAnnotationId);
    if (!ann) return;
    if (getMinFloatingUiZIndex(euiTheme.levels) === null) return;
    const target = resolveAnnotationTarget(ann.selector, getAnnotationViewportFallbackRect(ann));
    if (!isAnnotationTargetInFloatingLayer(target)) {
      setOpenAnnotationId(null);
      setReplyText('');
    }
  }, [openAnnotationId, annotations, overlayEpoch, euiTheme.levels]);

  // Close thread when its annotation is hidden (e.g. flyout closed).
  useEffect(() => {
    if (!openAnnotationId) return;
    const scrollR =
      document.getElementById('app-main-scroll')?.getBoundingClientRect().right ?? null;
    const ann = annotations.find((a) => a.id === openAnnotationId);
    if (!ann) {
      setOpenAnnotationId(null);
      setReplyText('');
      return;
    }
    if (
      !(showResolved || !ann.resolved) ||
      !isAnnotationRenderable(ann, euiTheme.levels, scrollR)
    ) {
      setOpenAnnotationId(null);
      setReplyText('');
    }
  }, [openAnnotationId, annotations, showResolved, euiTheme.levels, overlayEpoch]);

  // Load annotations
  useEffect(() => {
    setLoading(true);
    services.http
      .get<{ saved_objects: Array<{ id: string; attributes: SavedObjectAttributes }> }>(
        '/api/saved_objects/_find',
        { query: { type: SO_TYPE, per_page: 500 } }
      )
      .then(({ saved_objects }) => {
        const list = saved_objects.map(soToAnnotation);
        if (
          typeof window !== 'undefined' &&
          window.localStorage.getItem(DEBUG_ANNOTATIONS_KEY) === '1'
        ) {
          const scrollR =
            document.getElementById('app-main-scroll')?.getBoundingClientRect().right ?? null;
          for (const ann of list) {
            const matches = resolveAnnotationElements(ann.selector);
            const renderable = isAnnotationRenderable(ann, euiTheme.levels, scrollR);
            // eslint-disable-next-line no-console
            console.info('[CommentOverlay]', ann.id, {
              selectorLength: ann.selector.length,
              selectorPreview: ann.selector.slice(0, 200),
              matchCount: matches.length,
              isAnnotationRenderable: renderable,
              floatingAnchor: ann.floatingAnchor,
            });
          }
        }
        setAnnotations(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [services.http, euiTheme.levels]);

  const activateAnnotationMode = useCallback(() => {
    annotationCanvasVisibility.setVisible(true);
    if (!currentUser) {
      pendingActivation.current = true;
      setShowIdentityPrompt(true);
    } else {
      setIsAnnotationMode((prev) => !prev);
      setPendingPageRect(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const onEnterFromChrome = () => {
      annotationCanvasVisibility.setVisible(true);
      if (!currentUserRef.current) {
        pendingActivation.current = true;
        setShowIdentityPrompt(true);
        return;
      }
      setIsAnnotationMode(true);
      setPendingPageRect(null);
      setHoveredRect(null);
      hoveredElRef.current = null;
    };
    window.addEventListener(ACTIVATE_ANNOTATION_MODE_EVENT, onEnterFromChrome);
    return () => window.removeEventListener(ACTIVATE_ANNOTATION_MODE_EVENT, onEnterFromChrome);
  }, []);

  useEffect(() => {
    const onPromptRemoveAll = () => {
      setRemoveAllAnnotationsModalOpen(true);
    };
    window.addEventListener(PROMPT_REMOVE_ALL_ANNOTATIONS_EVENT, onPromptRemoveAll);
    return () => window.removeEventListener(PROMPT_REMOVE_ALL_ANNOTATIONS_EVENT, onPromptRemoveAll);
  }, []);

  useEffect(() => {
    if (!canvasVisible) {
      setOpenAnnotationId(null);
      setReplyText('');
    }
  }, [canvasVisible]);

  useEffect(() => {
    if (!canvasVisible && isAnnotationMode) {
      setIsAnnotationMode(false);
      setPendingPageRect(null);
      setHoveredRect(null);
      hoveredElRef.current = null;
      setNewText('');
      setPendingSelector('');
      setSaveError(null);
    }
  }, [canvasVisible, isAnnotationMode]);

  // Keyboard shortcut: ⇧⌘K (Mac) / Shift+Ctrl+K (others) — ignored in editable fields
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableKeyboardTarget(e.target)) return;
      if (isPrimaryModifier(e) && e.key.toLowerCase() === 'k' && e.shiftKey && !e.altKey) {
        e.preventDefault();
        activateAnnotationMode();
      }
      if (e.key === 'Escape' && isAnnotationMode) {
        setIsAnnotationMode(false);
        setPendingPageRect(null);
        setHoveredRect(null);
        setNewText('');
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activateAnnotationMode, isAnnotationMode]);

  // Handlers for the seek overlay (only active when seeking, not when element is locked)
  const handleSeekMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const overlay = seekOverlayRef.current;
      if (!overlay) return;
      // Briefly disable pointer-events so elementFromPoint finds the element BELOW the overlay
      overlay.style.pointerEvents = 'none';
      const underlying = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      overlay.style.pointerEvents = 'all';
      const el = underlying ? findAnnotatableElement(underlying, e.clientX, e.clientY) : null;
      if (el !== hoveredElRef.current) {
        hoveredElRef.current = el;
        setHoveredRect(el ? el.getBoundingClientRect() : null);
        setHoveredLabel(el ? getElementLabel(el) : '');
      }
      scheduleSeekCursor(e.clientX, e.clientY);
    },
    [scheduleSeekCursor]
  );

  const handleSeekWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const overlay = seekOverlayRef.current;
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
      overlay.style.pointerEvents = 'all';
      const flyoutScrollPort =
        (under?.closest?.('.euiFlyoutBody__overflow') as HTMLElement | null) ??
        (under?.closest?.('.euiFlyoutBody__overflowContent') as HTMLElement | null) ??
        (under?.closest?.('.euiFlyoutBody') as HTMLElement | null);
      if (flyoutScrollPort) {
        flyoutScrollPort.scrollTop += e.deltaY;
        flyoutScrollPort.scrollLeft += e.deltaX;
        e.preventDefault();
        return;
      }
    }
    const scrollEl = document.getElementById('app-main-scroll');
    if (scrollEl) {
      scrollEl.scrollTop += e.deltaY;
      scrollEl.scrollLeft += e.deltaX;
    }
  }, []);

  const handleSeekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const overlay = seekOverlayRef.current;
    if (!overlay) return;
    e.preventDefault();
    overlay.style.pointerEvents = 'none';
    const underlying = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
    overlay.style.pointerEvents = 'all';
    const el = underlying ? findAnnotatableElement(underlying, e.clientX, e.clientY) : null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPendingPageRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    setPendingSelector(generateAnnotationSelector(el));
    setHoveredRect(null);
    hoveredElRef.current = null;
  }, []);

  const submitIdentity = () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(IDENTITY_KEY, name);
    setCurrentUser(name);
    setShowIdentityPrompt(false);
    setNameInput('');
    if (pendingActivation.current) {
      pendingActivation.current = false;
      setIsAnnotationMode(true);
    }
  };

  const saveAnnotation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingPageRect || !newText.trim() || !currentUser) return;
    setSaveError(null);
    const pendingEl = pendingSelector
      ? resolveAnnotationTarget(pendingSelector, pendingPageRect)
      : null;
    const inFloating = isFloatingAnnotationContext(pendingSelector, pendingEl);
    const mainScrollTop = document.getElementById('app-main-scroll')?.scrollTop ?? 0;
    const attributes: SavedObjectAttributes = {
      clientX: Math.round(pendingPageRect.x),
      // Main-scroll "page Y" is only for targets inside #app-main-scroll; flyout/modal rects are viewport-space.
      clientY: Math.round(inFloating ? pendingPageRect.y : pendingPageRect.y + mainScrollTop),
      elemWidth: Math.round(pendingPageRect.width),
      elemHeight: Math.round(pendingPageRect.height),
      selector: pendingSelector,
      text: newText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
      pathname: window.location.pathname,
      floatingAnchor: inFloating,
    };
    setSaving(true);
    try {
      const created = await services.http.post<unknown>(`/api/saved_objects/${SO_TYPE}`, {
        body: JSON.stringify({ attributes }),
      });
      if (
        !created ||
        typeof created !== 'object' ||
        !('id' in created) ||
        !('attributes' in created) ||
        typeof (created as { id: unknown }).id !== 'string' ||
        typeof (created as { attributes: unknown }).attributes !== 'object'
      ) {
        throw new Error('Unexpected response when saving annotation');
      }
      setAnnotations((prev) => [
        ...prev,
        soToAnnotation(created as { id: string; attributes: SavedObjectAttributes }),
      ]);
      setOverlayEpoch((n) => n + 1);
      setPendingPageRect(null);
      setPendingSelector('');
      setNewText('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CommentOverlay] Failed to save annotation:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Check console.');
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (id: string) => {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;
    const updated = { ...ann, resolved: !ann.resolved };
    setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)));
    await services.http
      .put(`/api/saved_objects/${SO_TYPE}/${id}`, {
        body: JSON.stringify({ attributes: { resolved: updated.resolved } }),
      })
      .catch(() => setAnnotations((prev) => prev.map((a) => (a.id === id ? ann : a))));
    setOpenAnnotationId(null);
  };

  const deleteAnnotation = async (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (openAnnotationId === id) setOpenAnnotationId(null);
    await services.http.delete(`/api/saved_objects/${SO_TYPE}/${id}`).catch(() => {});
  };

  const confirmRemoveAllAnnotations = useCallback(async () => {
    const ids = annotations.map((a) => a.id);
    if (ids.length === 0) {
      setRemoveAllAnnotationsModalOpen(false);
      return;
    }
    setRemoveAllAnnotationsInProgress(true);
    try {
      await Promise.allSettled(
        ids.map((id) => services.http.delete(`/api/saved_objects/${SO_TYPE}/${id}`))
      );
      const { saved_objects } = await services.http.get<{
        saved_objects: Array<{ id: string; attributes: SavedObjectAttributes }>;
      }>('/api/saved_objects/_find', { query: { type: SO_TYPE, per_page: 500 } });
      setAnnotations(saved_objects.map(soToAnnotation));
      setOpenAnnotationId(null);
      setReplyText('');
    } catch {
      // Refresh failed after deletes; list may be stale until next load.
    } finally {
      setRemoveAllAnnotationsInProgress(false);
      setRemoveAllAnnotationsModalOpen(false);
    }
  }, [annotations, services.http]);

  const addReply = async (annotationId: string) => {
    if (!replyText.trim() || !currentUser) return;
    const ann = annotations.find((a) => a.id === annotationId);
    if (!ann) return;
    const newReply: Reply = {
      id: generateId(),
      text: replyText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
    };
    const updatedReplies = [...ann.replies, newReply];
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotationId ? { ...a, replies: updatedReplies } : a))
    );
    setReplyText('');
    await services.http
      .put(`/api/saved_objects/${SO_TYPE}/${annotationId}`, {
        body: JSON.stringify({ attributes: { replies: updatedReplies } }),
      })
      .catch(() =>
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotationId ? { ...a, replies: ann.replies } : a))
        )
      );
  };

  const resolvedCount = annotations.filter((a) => a.resolved).length;
  const scrollContentRight =
    document.getElementById('app-main-scroll')?.getBoundingClientRect().right ?? null;
  const visibleAnnotations = annotations.filter(
    (a) =>
      (showResolved || !a.resolved) &&
      isAnnotationRenderable(a, euiTheme.levels, scrollContentRight)
  );

  const pathnameForLabels = window.location.pathname;
  const labelIndexByAnnotationId = useMemo(
    () =>
      new Map(
        [...annotations]
          .filter(
            (a) =>
              (!a.pathname || a.pathname === pathnameForLabels) && (showResolved || !a.resolved)
          )
          .sort((a, b) => {
            const ta = new Date(a.createdAt).getTime();
            const tb = new Date(b.createdAt).getTime();
            if (ta !== tb) return ta - tb;
            return a.id.localeCompare(b.id);
          })
          .map((a, i) => [a.id, i + 1] as const)
      ),
    [annotations, pathnameForLabels, showResolved]
  );

  void overlayEpoch;
  const maxFloatingZ = getMaxFloatingUiZIndex(euiTheme.levels);
  const annotationModeChromeZ = Math.max(Number(euiTheme.levels.toast) - 1, maxFloatingZ + 50);

  /** Flyout “whole body” locks are tall; placing the composer under the rect pushes it off-screen. */
  const pendingComposerDockBottom =
    pendingPageRect != null &&
    (pendingPageRect.height > window.innerHeight * 0.28 ||
      pendingPageRect.y + pendingPageRect.height + 96 > window.innerHeight - 16);
  const pendingComposerLeftClamped = pendingPageRect
    ? Math.min(Math.max(12, pendingPageRect.x), window.innerWidth - 328)
    : 0;

  return ReactDOM.createPortal(
    <>
      {/* Identity prompt */}
      {showIdentityPrompt && (
        <div
          data-annotation-overlay="true"
          css={css`
            position: fixed;
            inset: 0;
            z-index: 10010;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
          `}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowIdentityPrompt(false);
              pendingActivation.current = false;
            }
          }}
          onKeyDown={(e) => {
            if (e.target === e.currentTarget && e.key === 'Escape') {
              setShowIdentityPrompt(false);
              pendingActivation.current = false;
            }
          }}
        >
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border-radius: 10px;
              padding: 28px 32px;
              width: 340px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            `}
          >
            <EuiTitle size="s">
              <h3>What&apos;s your name?</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>Your name will appear on annotations you add. Only asked once.</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFieldText
              data-test-subj="observabilityOnboardingCommentOverlayFieldText"
              placeholder="e.g. Sarah"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              fullWidth
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitIdentity();
                if (e.key === 'Escape') {
                  setShowIdentityPrompt(false);
                  pendingActivation.current = false;
                }
              }}
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="observabilityOnboardingCommentOverlayCancelButton"
                  size="s"
                  onClick={() => {
                    setShowIdentityPrompt(false);
                    pendingActivation.current = false;
                  }}
                >
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="observabilityOnboardingCommentOverlayContinueButton"
                  size="s"
                  fill
                  onClick={submitIdentity}
                  isDisabled={!nameInput.trim()}
                >
                  Continue
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      )}

      {removeAllAnnotationsModalOpen ? (
        <EuiConfirmModal
          data-test-subj="observabilityOnboardingRemoveAllAnnotationsModal"
          title="Remove all annotations?"
          onCancel={() => {
            if (removeAllAnnotationsInProgress) return;
            setRemoveAllAnnotationsModalOpen(false);
          }}
          onConfirm={confirmRemoveAllAnnotations}
          cancelButtonText="Cancel"
          confirmButtonText="Remove all"
          buttonColor="danger"
          defaultFocusedButton={CANCEL_BUTTON}
          isLoading={removeAllAnnotationsInProgress}
          confirmButtonDisabled={annotations.length === 0}
        >
          {annotations.length === 0 ? (
            <p>There are no annotations to remove.</p>
          ) : (
            <p>
              Permanently delete all {annotations.length}{' '}
              {annotations.length === 1 ? 'annotation' : 'annotations'}? You cannot undo this.
            </p>
          )}
        </EuiConfirmModal>
      ) : null}

      {/* Live element highlight (viewport-relative, no JS lag) */}
      {canvasVisible && isAnnotationMode && hoveredRect && (
        <div
          data-annotation-overlay="true"
          css={css`
            position: fixed;
            top: ${hoveredRect.top}px;
            left: ${hoveredRect.left}px;
            width: ${hoveredRect.width}px;
            height: ${hoveredRect.height}px;
            border: 2px solid ${euiTheme.colors.backgroundFilledPrimary};
            background: rgba(0, 102, 255, 0.03);
            border-radius: 4px;
            pointer-events: none;
            z-index: ${annotationModeChromeZ + 2};
            box-sizing: border-box;
          `}
        >
          <span
            css={css`
              position: absolute;
              top: -22px;
              left: 0;
              background: ${euiTheme.colors.backgroundFilledPrimary};
              color: #fff;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 4px 4px 4px 0;
              white-space: nowrap;
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {hoveredLabel}
          </span>
        </div>
      )}

      {/* Seek overlay — only when no element is locked. Captures hover+click via React,
          so when it's removed (element locked) nothing intercepts the save button. */}
      {canvasVisible && isAnnotationMode && !pendingPageRect && (
        <div
          ref={seekOverlayRef}
          data-annotation-overlay="true"
          onPointerEnter={(e) => scheduleSeekCursor(e.clientX, e.clientY)}
          onMouseMove={handleSeekMouseMove}
          onClick={handleSeekClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsAnnotationMode(false);
              setPendingPageRect(null);
              setHoveredRect(null);
              setNewText('');
            }
          }}
          onWheel={handleSeekWheel}
          css={css`
            position: fixed;
            inset: 0;
            z-index: ${annotationModeChromeZ};
            cursor: none;
          `}
        >
          {seekCursor ? (
            <div
              aria-hidden
              css={css`
                position: fixed;
                left: ${seekCursor.x}px;
                top: ${seekCursor.y}px;
                transform: translate(10px, 6px);
                z-index: ${annotationModeChromeZ + 2};
                pointer-events: none;
              `}
            >
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 5px;
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${euiTheme.colors.emptyShade};
                  ${seekTooltipShadow}
                `}
              >
                <EuiIcon type="discuss" size="m" color="primary" />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Annotation input — below locked target. `data-no-focus-lock` opts out of Eui flyout/modal
          focus traps; portaling into `.euiFlyout` hid the bar (clip-path + transform). */}
      {canvasVisible && isAnnotationMode && pendingPageRect && (
        <div
          data-annotation-overlay="true"
          data-no-focus-lock
          css={
            pendingComposerDockBottom
              ? css`
                  position: fixed;
                  bottom: 20px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: min(400px, calc(100vw - 24px));
                  z-index: ${annotationModeChromeZ + 6};
                  pointer-events: auto;
                `
              : css`
                  position: fixed;
                  top: ${pendingPageRect.y + pendingPageRect.height + 10}px;
                  left: ${pendingComposerLeftClamped}px;
                  z-index: ${annotationModeChromeZ + 6};
                  pointer-events: auto;
                `
          }
        >
          <form onSubmit={saveAnnotation}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                background: ${euiTheme.colors.backgroundBasePlain};
                border-radius: 999px;
                padding: 6px 6px 6px 10px;
                width: ${pendingComposerDockBottom ? '100%' : '320px'};
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiAvatar
                  name={currentUser ?? 'You'}
                  size="s"
                  color={euiTheme.colors.backgroundFilledPrimary}
                  css={css`
                    color: #fff !important;
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  data-test-subj="observabilityOnboardingCommentOverlayFieldText"
                  placeholder="Add annotation…"
                  value={newText}
                  onChange={(evt) => setNewText(evt.target.value)}
                  autoFocus
                  compressed
                  fullWidth
                  onKeyDown={(evt) => {
                    if (evt.key === 'Escape') {
                      setPendingPageRect(null);
                      setNewText('');
                      setSaveError(null);
                    }
                  }}
                  css={css`
                    border: none !important;
                    box-shadow: none !important;
                    background: transparent !important;
                    padding-left: 4px !important;
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <button
                  type="submit"
                  disabled={!newText.trim() || saving}
                  css={css`
                    border: none;
                    cursor: ${newText.trim() && !saving ? 'pointer' : 'default'};
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: ${newText.trim()
                      ? euiTheme.colors.backgroundFilledPrimary
                      : euiTheme.colors.backgroundBaseSubdued};
                    color: ${newText.trim() ? '#fff' : euiTheme.colors.textSubdued};
                    font-size: 16px;
                    line-height: 1;
                    transition: opacity 0.15s ease;
                    &:disabled {
                      opacity: 0.5;
                    }
                    &:not(:disabled):hover {
                      opacity: 0.85;
                    }
                  `}
                >
                  {saving ? '…' : '↑'}
                </button>
              </EuiFlexItem>
            </EuiFlexGroup>
          </form>
          {saveError && (
            <div
              css={css`
                margin-top: 6px;
                padding: 6px 12px;
                background: ${euiTheme.colors.backgroundFilledDanger};
                color: #fff;
                border-radius: 6px;
                font-size: 12px;
                max-width: 320px;
              `}
            >
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div
          css={css`
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10001;
          `}
        >
          <EuiLoadingSpinner size="m" />
        </div>
      )}

      {/* Show/hide resolved toggle */}
      {canvasVisible && !loading && resolvedCount > 0 && (
        <div
          data-annotation-overlay="true"
          css={css`
            position: fixed;
            bottom: 80px;
            right: 24px;
            z-index: 10001;
          `}
        >
          <button
            onClick={() => setShowResolved((v) => !v)}
            css={css`
              background: ${euiTheme.colors.backgroundBasePlain};
              border: 1px solid ${euiTheme.colors.borderBaseSubdued};
              border-radius: 8px;
              padding: 4px 12px;
              font-size: 12px;
              cursor: pointer;
              color: ${euiTheme.colors.textSubdued};
              white-space: nowrap;
              &:hover {
                background: ${euiTheme.colors.backgroundBaseSubdued};
              }
            `}
          >
            {showResolved ? 'Hide resolved' : `Show resolved (${resolvedCount})`}
          </button>
        </div>
      )}

      {/* Main page: clip to #app-main-scroll. Flyouts/modals: one full-viewport fixed layer using
          live getBoundingClientRect (no per-shell portals — avoids silent drops and clipping). */}
      {(() => {
        if (!canvasVisible) {
          return null;
        }
        const clipEl = document.getElementById('app-main-scroll');
        const scrollTop = clipEl?.scrollTop ?? 0;
        const scrollCr =
          clipEl?.getBoundingClientRect() ??
          ({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect);

        const viewportClip = {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };

        const minFloatingZ = getMinFloatingUiZIndex(euiTheme.levels);
        const backgroundLayerZ = minFloatingZ == null ? 9998 : Math.max(0, minFloatingZ - 1);
        // Must sit clearly above EUI flyouts/masks or badges look correct but hit-testing goes
        // to the flyout (sibling paint order). Match annotation-mode chrome, not toast-10 / +5.
        const floatingTargetLayerZ = Math.max(Number(euiTheme.levels.toast) - 1, maxFloatingZ + 50);

        const backgroundAnns: Annotation[] = [];
        const overlayAnns: Annotation[] = [];
        for (const ann of visibleAnnotations) {
          const t = resolveAnnotationTarget(ann.selector, getAnnotationViewportFallbackRect(ann));
          // Persisted floatingAnchor keeps badges in the viewport clip layer. Relying only on
          // `querySelector` can mis-bucket into #app-main-scroll while the flyout sits outside it.
          if (treatAnnotationAsFloating(ann) || isAnnotationTargetInFloatingLayer(t)) {
            overlayAnns.push(ann);
          } else {
            backgroundAnns.push(ann);
          }
        }

        const pendingTarget = pendingSelector
          ? resolveAnnotationTarget(pendingSelector, pendingPageRect)
          : null;
        const pendingInFloating =
          Boolean(isAnnotationMode && pendingPageRect) &&
          isFloatingAnnotationContext(pendingSelector, pendingTarget);

        const showBackgroundLocked =
          Boolean(isAnnotationMode && pendingPageRect) && !pendingInFloating;
        const showFloatingLocked =
          Boolean(isAnnotationMode && pendingPageRect) && pendingInFloating;

        const renderClipLayer = (
          anns: Annotation[],
          layerZ: number,
          clip: { top: number; left: number; width: number; height: number },
          scrollTopForResolve: number,
          showLockedHighlight: boolean,
          popoverZIndex?: number,
          /** Clip layer overflow; viewport `hidden` can clip transforms that extend past the clip rect. */
          clipOverflow: 'hidden' | 'visible' = 'hidden',
          /** Flyout/modal + legacy floating: viewport client coords; clamp badges inside the clip. */
          floatingViewportFallback = false
        ) => (
          <div
            data-annotation-overlay="true"
            css={css`
              position: fixed;
              top: ${clip.top}px;
              left: ${clip.left}px;
              width: ${clip.width}px;
              height: ${clip.height}px;
              overflow: ${clipOverflow};
              pointer-events: none;
              z-index: ${layerZ};
            `}
          >
            {showLockedHighlight && pendingPageRect && (
              <div
                data-annotation-overlay="true"
                css={css`
                  position: absolute;
                  top: ${pendingPageRect.y - clip.top}px;
                  left: ${pendingPageRect.x - clip.left}px;
                  width: ${pendingPageRect.width}px;
                  height: ${pendingPageRect.height}px;
                  border: 2px solid ${euiTheme.colors.backgroundFilledPrimary};
                  border-radius: 4px;
                  pointer-events: none;
                  box-sizing: border-box;
                `}
              />
            )}

            {anns.map((ann, annIndex) => {
              const fallbackY = floatingViewportFallback
                ? treatAnnotationAsFloating(ann)
                  ? ann.pageY
                  : ann.pageY - scrollTopForResolve
                : ann.pageY - scrollTopForResolve;
              const rect = resolveElementRect(ann.selector, {
                x: ann.pageX,
                y: fallbackY,
                width: ann.elemWidth,
                height: ann.elemHeight,
              });
              const badgeX = rect.x + rect.width - clip.left;
              const badgeY = rect.y - clip.top;
              let sameSelectorStagger = 0;
              for (let j = 0; j < annIndex; j++) {
                if (anns[j].selector === ann.selector) sameSelectorStagger += 1;
              }
              const staggerPx = sameSelectorStagger * 14;
              let badgeCenterX = badgeX + staggerPx;
              let badgeCenterY = badgeY;
              if (floatingViewportFallback) {
                const inset = 15;
                const maxX = Math.max(inset, clip.width - inset);
                const maxY = Math.max(inset, clip.height - inset);
                badgeCenterX = Math.min(Math.max(inset, badgeCenterX), maxX);
                badgeCenterY = Math.min(Math.max(inset, badgeCenterY), maxY);
              }
              const labelIndex = labelIndexByAnnotationId.get(ann.id) ?? 1;
              const badgeTransform = 'translate(-50%, -50%)';
              const badgeTransformHover = 'translate(-50%, -50%) scale(1.2)';

              return (
                <div
                  key={ann.id}
                  data-annotation-overlay="true"
                  css={css`
                    position: absolute;
                    top: ${badgeCenterY}px;
                    left: ${badgeCenterX}px;
                    pointer-events: auto;
                  `}
                >
                  <div
                    css={css`
                      position: absolute;
                      top: 0;
                      left: ${-rect.width}px;
                      width: ${rect.width}px;
                      height: ${rect.height}px;
                      border: 1.5px dashed
                        ${ann.resolved
                          ? euiTheme.colors.textSubdued
                          : euiTheme.colors.backgroundFilledPrimary};
                      border-radius: 4px;
                      pointer-events: none;
                      opacity: 0.4;
                      box-sizing: border-box;
                    `}
                  />

                  <EuiPopover
                    isOpen={openAnnotationId === ann.id}
                    closePopover={() => {
                      setOpenAnnotationId(null);
                      setReplyText('');
                    }}
                    panelPaddingSize="m"
                    panelStyle={{ width: 320 }}
                    {...(popoverZIndex != null ? { zIndex: popoverZIndex } : {})}
                    button={
                      <button
                        data-annotation-overlay="true"
                        onClick={() =>
                          setOpenAnnotationId(openAnnotationId === ann.id ? null : ann.id)
                        }
                        css={css`
                          width: 24px;
                          height: 24px;
                          border-radius: 50%;
                          background: ${ann.resolved
                            ? euiTheme.colors.textSubdued
                            : euiTheme.colors.backgroundFilledPrimary};
                          border: 2px solid #fff;
                          cursor: pointer;
                          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          transform: ${badgeTransform};
                          transition: box-shadow 0.15s ease, transform 0.15s ease;
                          &:hover {
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                            transform: ${badgeTransformHover};
                          }
                        `}
                      >
                        <span
                          css={css`
                            color: #fff;
                            font-size: 10px;
                            font-weight: 700;
                            line-height: 1;
                          `}
                        >
                          {labelIndex}
                        </span>
                      </button>
                    }
                  >
                    <EuiCommentList aria-label={`Annotation ${labelIndex}`}>
                      <EuiComment
                        username={ann.author}
                        timestamp={new Date(ann.createdAt).toLocaleString()}
                        event="annotated"
                        actions={
                          <EuiButtonIcon
                            data-test-subj="observabilityOnboardingAnnotationDeleteButton"
                            iconType="trash"
                            color="danger"
                            size="xs"
                            aria-label="Delete annotation"
                            onClick={() => deleteAnnotation(ann.id)}
                          />
                        }
                      >
                        <EuiText size="s">
                          <p>{ann.text}</p>
                        </EuiText>
                      </EuiComment>
                      {ann.replies.map((reply) => (
                        <EuiComment
                          key={reply.id}
                          username={reply.author}
                          timestamp={new Date(reply.createdAt).toLocaleString()}
                          event="replied"
                        >
                          <EuiText size="s">
                            <p>{reply.text}</p>
                          </EuiText>
                        </EuiComment>
                      ))}
                    </EuiCommentList>
                    <EuiSpacer size="s" />
                    <EuiTextArea
                      data-test-subj="observabilityOnboardingRenderClipLayerTextArea"
                      placeholder="Reply… (Ctrl+Enter to send)"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      fullWidth
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addReply(ann.id);
                      }}
                    />
                    <EuiSpacer size="s" />
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem>
                        <EuiButtonEmpty
                          data-test-subj="observabilityOnboardingAnnotationResolveButton"
                          size="s"
                          iconType={ann.resolved ? 'refresh' : 'checkInCircleFilled'}
                          color={ann.resolved ? 'text' : 'success'}
                          onClick={() => toggleResolved(ann.id)}
                        >
                          {ann.resolved ? 'Reopen' : 'Resolve'}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="observabilityOnboardingRenderClipLayerReplyButton"
                          size="s"
                          fill
                          isDisabled={!replyText.trim()}
                          onClick={() => addReply(ann.id)}
                        >
                          Reply
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPopover>
                </div>
              );
            })}
          </div>
        );

        const showBackgroundLayer = backgroundAnns.length > 0 || showBackgroundLocked;
        const showFloatingOverlay = overlayAnns.length > 0 || showFloatingLocked;

        return (
          <>
            {showBackgroundLayer &&
              renderClipLayer(
                backgroundAnns,
                backgroundLayerZ,
                scrollCr,
                scrollTop,
                showBackgroundLocked,
                undefined
              )}
            {showFloatingOverlay &&
              renderClipLayer(
                overlayAnns,
                floatingTargetLayerZ,
                viewportClip,
                scrollTop,
                showFloatingLocked,
                floatingTargetLayerZ + 20,
                'visible',
                true
              )}
          </>
        );
      })()}
    </>,
    document.body
  );
};
