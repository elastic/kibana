/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AnyAction, Store } from 'redux-v4';
import type { RenderResult } from '@testing-library/react';
import { act, prettyDOM, render } from '@testing-library/react';
import type { History as HistoryPackageHistoryInterface } from 'history';
import { coreMock } from '@kbn/core/public/mocks';
import { cellActionRenderer } from '../../../flyout_v2/shared/components/cell_actions';
import { spyMiddlewareFactory } from '../spy_middleware_factory';
import { resolverMiddlewareFactory } from '../../store/middleware';
import { MockResolver } from './mock_resolver';
import type { DataAccessLayer, SideEffectSimulator, SpyMiddleware, TimeFilters } from '../../types';
import { sideEffectSimulatorFactory } from '../../view/side_effect_simulator_factory';
import { uiSetting } from '../../mocks/ui_setting';
import { EMPTY_RESOLVER } from '../../store/helpers';
import type { State } from '../../../common/store/types';
import { createMockStore, mockGlobalState } from '../../../common/mock';
import { createResolver } from '../../store/actions';

/**
 * Test a Resolver instance using jest, @testing-library/react, and a mock data layer.
 */
export class Simulator {
  /**
   * The redux store, creating in the constructor using the `dataAccessLayer`.
   * This code subscribes to state transitions.
   */
  private readonly store: Store<State, AnyAction>;
  /**
   * A fake 'History' API used with `react-router` to simulate a browser history.
   */
  private readonly history: HistoryPackageHistoryInterface;
  /**
   * The result returned by `@testing-library/react` that contains the rendered Resolver react code.
   */
  private readonly renderResult: RenderResult;
  /**
   * The props currently passed to `MockResolver`. Used to re-render with updated props.
   */
  private props: React.ComponentProps<typeof MockResolver>;
  /**
   * A `redux` middleware that exposes all actions dispatched (along with the state at that point.)
   * This is used by `debugActions`.
   */
  private readonly spyMiddleware: SpyMiddleware;
  /**
   * Simulator which allows you to explicitly simulate resize events and trigger animation frames
   */
  private readonly sideEffectSimulator: SideEffectSimulator;
  /**
   * The mocked core services passed to Resolver through `KibanaContextProvider`. Tests can assert
   * against them, e.g. `coreStart.overlays.openSystemFlyout`.
   */
  public readonly coreStart: ReturnType<typeof coreMock.createStart>;

  /**
   * A CSS selector for process node elements.
   */
  public static nodeElementSelector({
    entityID,
    selected = false,
  }: ProcessNodeElementSelectorOptions = {}): string {
    let selector: string = baseNodeElementSelector;
    if (entityID !== undefined) {
      selector += `[data-test-resolver-node-id="${entityID}"]`;
    }
    if (selected) {
      selector += '[aria-selected="true"]';
    }
    return selector;
  }

  constructor({
    dataAccessLayer,
    resolverComponentInstanceID,
    databaseDocumentID,
    indices,
    history,
    filters,
    shouldUpdate,
  }: {
    /**
     * A (mock) data access layer that will be used to create the Resolver store.
     */
    dataAccessLayer: DataAccessLayer;
    /**
     * A string that uniquely identifies this Resolver instance among others mounted in the DOM.
     */
    resolverComponentInstanceID: string;
    /**
     * Indices that the backend would use to find the document ID.
     */
    indices: string[];
    /**
     * a databaseDocumentID to pass to Resolver. Resolver will use this in requests to the mock data layer.
     */
    databaseDocumentID: string;
    history: HistoryPackageHistoryInterface;
    filters: TimeFilters;
    shouldUpdate: boolean;
  }) {
    // create the spy middleware (for debugging tests)
    this.spyMiddleware = spyMiddlewareFactory();

    // Create a redux store w/ the top level Resolver reducer and the enhancer that includes the Resolver middleware and the `spyMiddleware`
    this.store = createMockStore(
      {
        ...mockGlobalState,
        analyzer: {
          [resolverComponentInstanceID]: EMPTY_RESOLVER,
        },
      },
      undefined,
      undefined,
      undefined,
      [resolverMiddlewareFactory(dataAccessLayer), this.spyMiddleware.middleware]
    );

    this.history = history;

    // Used for `KibanaContextProvider`
    this.coreStart = coreMock.createStart();

    this.coreStart.settings.client.get.mockImplementation(uiSetting);

    this.sideEffectSimulator = sideEffectSimulatorFactory();

    // Render Resolver via the `MockResolver` component, using `@testing-library/react`.
    this.props = {
      resolverComponentInstanceID,
      history: this.history,
      sideEffectSimulator: this.sideEffectSimulator,
      store: this.store,
      coreStart: this.coreStart,
      databaseDocumentID,
      indices,
      filters,
      shouldUpdate,
      renderCellActions: cellActionRenderer,
    };
    this.renderResult = render(<MockResolver {...this.props} />);
  }

  private setProps(props: Partial<React.ComponentProps<typeof MockResolver>>) {
    this.props = { ...this.props, ...props };
    this.renderResult.rerender(<MockResolver {...this.props} />);
  }

  /**
   * Unmount the Resolver component. Use this to test what happens when code that uses Resolver unmounts it.
   */
  public unmount(): void {
    this.unmounted = true;
    this.renderResult.unmount();
  }

  /**
   * Get the component instance ID from the component.
   */
  public get resolverComponentInstanceID(): string {
    return this.props.resolverComponentInstanceID;
  }

  /**
   * Change the component instance ID (updates the React component props.)
   */
  public set resolverComponentInstanceID(value: string) {
    this.store.dispatch(createResolver({ id: value }));
    this.setProps({ resolverComponentInstanceID: value });
  }

  /**
   * Change the indices (updates the React component props.)
   */
  public set indices(value: string[]) {
    this.setProps({ indices: value });
  }

  /**
   * Get the indices (updates the React component props.)
   */
  public get indices(): string[] {
    return this.props.indices;
  }

  /**
   * Change the shouldUpdate prop (updates the React component props.)
   */
  public set shouldUpdate(value: boolean) {
    this.setProps({ shouldUpdate: value });
  }

  public get shouldUpdate(): boolean {
    return this.props.shouldUpdate;
  }

  public set filters(value: TimeFilters) {
    this.setProps({ filters: value });
  }

  public get filters(): TimeFilters {
    return this.props.filters;
  }

  /**
   * Call this to console.log actions (and state). Use this to debug your tests.
   * State and actions aren't exposed otherwise because the tests using this simulator should
   * assert stuff about the DOM instead of internal state. Use selector/middleware/reducer
   * unit tests to test that stuff.
   */
  public debugActions(): /**
   * Optionally call this to stop debugging actions.
   */ () => void {
    return this.spyMiddleware.debugActions();
  }

  /**
   * Whether `unmount()` has been called. Used to guard against setState/update calls on a
   * unmounted component, which throw and would leave the Promise in `map()` permanently
   * unresolved.
   */
  private unmounted = false;

  /**
   * Yield the result of `mapper` over and over, once per event-loop cycle.
   * After 10 times, quit.
   * Use this to continually check a value. See `toYieldEqualTo`.
   *
   * Each iteration waits for a `setTimeout(0)` callback inside `act`, so that
   * React can flush pending state updates and effects between iterations.
   *
   * When the consumer breaks from the iteration early (e.g., `toYieldEqualTo`
   * finds a match and exits its `for await...of` loop), the generator is
   * terminated at the `yield` point via `generator.return()`. Because the
   * termination happens before the code after `yield` runs, no `setTimeout`
   * is registered and no cleanup is required.
   */
  public async *map<R>(mapper: (() => Promise<R>) | (() => R)): AsyncIterable<R> {
    let timeoutCount = 0;
    while (timeoutCount < 10) {
      timeoutCount++;
      yield mapper();
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
  }

  /**
   * Find a process node element. Takes options supported by `resolverNodeSelector`.
   * Returns an empty array if nothing is found.
   */
  public processNodeElements(options: ProcessNodeElementSelectorOptions = {}): HTMLElement[] {
    return this.domNodes(Simulator.nodeElementSelector(options));
  }

  /**
   * The button that opens a node's submenu.
   */
  public processNodeSubmenuButton(
    /** nodeID for the related node */ entityID: string
  ): HTMLElement[] {
    return this.domNodes(
      `[data-test-subj="resolver:submenu:button"][data-test-resolver-node-id="${entityID}"]`
    );
  }

  /**
   * The primary button (used to select a node) which contains a label for the node as its content.
   */
  public processNodePrimaryButton(
    /** nodeID for the related node */ entityID: string
  ): HTMLElement[] {
    return this.domNodes(
      `[data-test-subj="resolver:node:primary-button"][data-test-resolver-node-id="${entityID}"]`
    );
  }

  /**
   * Return the node element with the given `entityID`.
   */
  public selectedProcessNode(entityID: string): HTMLElement[] {
    return this.processNodeElements({ entityID, selected: true });
  }

  /**
   * Return the node element with the given `entityID`. It will only be returned if it is not selected.
   */
  public unselectedProcessNode(entityID: string): HTMLElement[] {
    return this.processNodeElements({ entityID }).filter(
      (element) => element.getAttribute('aria-selected') !== 'true'
    );
  }

  /**
   * Dump the rendered DOM (to be `console.log`ged as appropriate)
   */
  public debugWrapper() {
    return prettyDOM(this.renderResult.container);
  }

  /**
   * This manually runs the animation frames tied to a configurable timestamp in the future.
   */
  public runAnimationFramesTimeFromNow(time: number = 0) {
    act(() => {
      this.sideEffectSimulator.controls.time = time;
      this.sideEffectSimulator.controls.provideAnimationFrame();
    });
  }

  /**
   * The last value written to the clipboard via the `SideEffectors`.
   */
  public get clipboardText(): string {
    return this.sideEffectSimulator.controls.clipboardText;
  }

  /**
   * Call this to resolve the promise returned by the `SideEffectors` `writeText` method (which in production points to `navigator.clipboard.writeText`.
   */
  confirmTextWrittenToClipboard(): void {
    this.sideEffectSimulator.controls.confirmTextWrittenToClipboard();
  }

  /**
   * The 'search' part of the URL.
   */
  public get historyLocationSearch(): string {
    // Wrap the `search` value from the MemoryHistory using `URLSearchParams` in order to standardize it.
    return new URLSearchParams(this.history.location.search).toString();
  }

  /**
   * Given a 'data-test-subj' value, it will resolve the matching elements or undefined if not found
   */
  public async resolve(selector: string): Promise<HTMLElement[] | undefined> {
    return this.resolveWrapper(() => this.domNodes(`[data-test-subj="${selector}"]`));
  }

  /**
   * Given a `role`, return DOM nodes that have it. Use this to assert that ARIA roles are present as expected.
   */
  public domNodesWithRole(role: string): HTMLElement[] {
    return this.domNodes(`[role="${role}"]`);
  }

  /**
   * Given a 'data-test-subj' selector, it will return the domNode
   */
  public testSubject(selector: string): HTMLElement[] {
    return this.domNodes(`[data-test-subj="${selector}"]`);
  }

  /**
   * Given an element, returns the `dd` elements immediately following it.
   */
  public descriptionDetails(subject: HTMLElement): HTMLElement[] {
    let current = subject.nextElementSibling;
    const associated: HTMLElement[] = [];
    // Multiple `dt`s can be associated with a set of `dd`s. Skip immediately following `dt`s.
    while (current !== null && current.nodeName === 'DT') {
      current = current.nextElementSibling;
    }
    while (current !== null && current.nodeName === 'DD') {
      associated.push(current as HTMLElement);
      current = current.nextElementSibling;
    }
    return associated;
  }

  /**
   * Return DOM nodes that match `selector`.
   */
  private domNodes(selector: string): HTMLElement[] {
    // Scope to this instance's container so multiple simulators don't see each other's nodes.
    // EUI popovers render in portals attached to `document.body`, so include those as well.
    const roots: ParentNode[] = [
      this.renderResult.container,
      ...Array.from(document.body.querySelectorAll<HTMLElement>('[data-euiportal="true"]')),
    ];
    return roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>(selector)));
  }

  /**
   * The titles and descriptions (as text) from the node detail panel.
   */
  public nodeDetailEntries(): Array<[string, string]> {
    /**
     * The details of the selected node are shown in a table. This returns the title elements of the node list.
     */
    const titles = this.domNodes('[data-test-subj="resolver:node-detail:entry-title"]');
    /**
     * The details of the selected node are shown in a description list. This returns the description elements of the description list.
     */
    const descriptions = this.domNodes('[data-test-subj="resolver:node-detail:entry-description"]');
    const entries: Array<[string, string]> = [];
    for (let index = 0; index < Math.min(titles.length, descriptions.length); index++) {
      const title = titles[index].textContent ?? '';
      const description = descriptions[index].textContent ?? '';

      entries.push([title, description]);
    }
    return entries;
  }

  /**
   * Resolve the wrapper returned by `wrapperFactory` only once it has at least 1 element in it.
   */
  public async resolveWrapper(
    wrapperFactory: (() => Promise<HTMLElement[]>) | (() => HTMLElement[]),
    predicate: (elements: HTMLElement[]) => boolean = (elements) => elements.length > 0
  ): Promise<HTMLElement[] | undefined> {
    for await (const wrapper of this.map(wrapperFactory)) {
      if (predicate(wrapper)) {
        return wrapper;
      }
    }
  }
}

const baseNodeElementSelector = '[data-test-subj="resolver:node"]';

interface ProcessNodeElementSelectorOptions {
  /**
   * Entity ID of the node. If passed, will be used to create an data-attribute CSS selector that should only get the related node element.
   */
  entityID?: string;
  /**
   * If true, only get nodes with an `[aria-selected="true"]` attribute.
   */
  selected?: boolean;
}
