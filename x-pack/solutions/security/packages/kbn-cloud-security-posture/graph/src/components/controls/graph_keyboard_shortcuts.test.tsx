/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef, useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import {
  GraphKeyboardShortcuts,
  type GraphKeyboardShortcutsProps,
} from './graph_keyboard_shortcuts';

jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(),
}));

const useReactFlowMock = useReactFlow as jest.Mock;

const fitViewOptions = { duration: 200 };

type TestProps = Partial<Omit<GraphKeyboardShortcutsProps, 'graphRootRef'>>;

const TestHarness = ({ ownPanelRefs = [], ...props }: TestProps) => {
  const graphRootRef = useRef<HTMLDivElement>(null);
  return (
    <div role="dialog" data-test-subj="hostDialog">
      <div ref={graphRootRef} data-test-subj="graphRoot">
        <input type="text" data-test-subj="textInput" />
        <input type="checkbox" data-test-subj="checkbox" />
        <GraphKeyboardShortcuts
          enabled={true}
          graphRootRef={graphRootRef}
          ownPanelRefs={ownPanelRefs}
          fitViewOptions={fitViewOptions}
          onToggleDisplayOptions={jest.fn()}
          {...props}
        />
      </div>
    </div>
  );
};

describe('GraphKeyboardShortcuts', () => {
  let zoomIn: jest.Mock;
  let zoomOut: jest.Mock;
  let fitView: jest.Mock;

  beforeEach(() => {
    zoomIn = jest.fn();
    zoomOut = jest.fn();
    fitView = jest.fn();
    useReactFlowMock.mockReturnValue({ zoomIn, zoomOut, fitView });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should toggle search on "s"', () => {
    const onToggleSearch = jest.fn();
    render(<TestHarness onToggleSearch={onToggleSearch} />);

    fireEvent.keyDown(document.body, { key: 's' });

    expect(onToggleSearch).toHaveBeenCalledTimes(1);
  });

  it('should toggle display options on "d"', () => {
    const onToggleDisplayOptions = jest.fn();
    render(<TestHarness onToggleDisplayOptions={onToggleDisplayOptions} />);

    fireEvent.keyDown(document.body, { key: 'd' });

    expect(onToggleDisplayOptions).toHaveBeenCalledTimes(1);
  });

  it.each(['+', '='])('should zoom in on "%s"', (key) => {
    render(<TestHarness />);

    fireEvent.keyDown(document.body, { key });

    expect(zoomIn).toHaveBeenCalledWith({ duration: 200 });
  });

  it.each(['-', '_'])('should zoom out on "%s"', (key) => {
    render(<TestHarness />);

    fireEvent.keyDown(document.body, { key });

    expect(zoomOut).toHaveBeenCalledWith({ duration: 200 });
  });

  it('should fit the view on "0"', () => {
    render(<TestHarness />);

    fireEvent.keyDown(document.body, { key: '0' });

    expect(fitView).toHaveBeenCalledWith(fitViewOptions);
  });

  it('should center on the given nodes on "c"', () => {
    render(<TestHarness nodeIdsToCenterOn={['node1']} />);

    fireEvent.keyDown(document.body, { key: 'c' });

    expect(fitView).toHaveBeenCalledWith({ ...fitViewOptions, nodes: [{ id: 'node1' }] });
  });

  it('should not center on "c" when there are no nodes to center on', () => {
    render(<TestHarness nodeIdsToCenterOn={[]} />);

    fireEvent.keyDown(document.body, { key: 'c' });

    expect(fitView).not.toHaveBeenCalled();
  });

  it('should match letter shortcuts regardless of case', () => {
    const onToggleDisplayOptions = jest.fn();
    render(<TestHarness onToggleDisplayOptions={onToggleDisplayOptions} />);

    fireEvent.keyDown(document.body, { key: 'D', shiftKey: true });

    expect(onToggleDisplayOptions).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
    ['altKey', { altKey: true }],
  ])('should ignore shortcuts combined with %s', (_, modifier) => {
    render(<TestHarness />);

    fireEvent.keyDown(document.body, { key: '+', ...modifier });

    expect(zoomIn).not.toHaveBeenCalled();
  });

  it('should ignore keys typed into a text input', () => {
    const { getByTestId } = render(<TestHarness />);

    fireEvent.keyDown(getByTestId('textInput'), { key: '0' });

    expect(fitView).not.toHaveBeenCalled();
  });

  it('should handle keys pressed while a checkbox is focused', () => {
    const { getByTestId } = render(<TestHarness />);

    fireEvent.keyDown(getByTestId('checkbox'), { key: '0' });

    expect(fitView).toHaveBeenCalledTimes(1);
  });

  it('should ignore shortcuts when disabled', () => {
    render(<TestHarness enabled={false} />);

    fireEvent.keyDown(document.body, { key: '+' });

    expect(zoomIn).not.toHaveBeenCalled();
  });

  it('should keep zooming while the key is held but not repeat toggles', () => {
    const onToggleDisplayOptions = jest.fn();
    render(<TestHarness onToggleDisplayOptions={onToggleDisplayOptions} />);

    fireEvent.keyDown(document.body, { key: '+', repeat: true });
    fireEvent.keyDown(document.body, { key: 'd', repeat: true });

    expect(zoomIn).toHaveBeenCalledTimes(1);
    expect(onToggleDisplayOptions).not.toHaveBeenCalled();
  });

  it('should ignore keys pressed inside an unrelated dialog', () => {
    const { getByTestId } = render(
      <>
        <TestHarness />
        <div role="dialog">
          <button type="button" data-test-subj="otherDialogButton" />
        </div>
      </>
    );

    fireEvent.keyDown(getByTestId('otherDialogButton'), { key: '0' });

    expect(fitView).not.toHaveBeenCalled();
  });

  it('should handle keys pressed inside a dialog that hosts the graph', () => {
    const { getByTestId } = render(<TestHarness />);

    fireEvent.keyDown(getByTestId('hostDialog'), { key: '0' });

    expect(fitView).toHaveBeenCalledTimes(1);
  });

  it("should handle keys pressed inside the graph's own popover panels", () => {
    const panelRef = createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <>
        <TestHarness ownPanelRefs={[panelRef]} />
        <div role="dialog" ref={panelRef}>
          <button type="button" data-test-subj="ownPanelButton" />
        </div>
      </>
    );

    fireEvent.keyDown(getByTestId('ownPanelButton'), { key: '0' });

    expect(fitView).toHaveBeenCalledTimes(1);
  });

  it('should stop listening after unmount', () => {
    const { unmount } = render(<TestHarness />);
    unmount();

    fireEvent.keyDown(document.body, { key: '+' });

    expect(zoomIn).not.toHaveBeenCalled();
  });
});
