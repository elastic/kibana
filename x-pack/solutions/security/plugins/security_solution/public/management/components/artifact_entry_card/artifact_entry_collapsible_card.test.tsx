/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { act, fireEvent } from '@testing-library/react';
import type { AnyArtifact, ArtifactInfo } from './types';
import { getTrustedAppProviderMock, getExceptionProviderMock } from './test_utils';
import type { ArtifactEntryCollapsibleCardProps } from './artifact_entry_collapsible_card';
import { ArtifactEntryCollapsibleCard } from './artifact_entry_collapsible_card';
import type { ArtifactEntryCardDecoratorProps } from './artifact_entry_card';
import type { CriteriaConditionsProps } from './components/criteria_conditions';
import { DISABLED_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';

describe.each([
  ['trusted apps' as const, getTrustedAppProviderMock],
  ['exceptions/event filters' as const, getExceptionProviderMock],
])('when using the ArtifactEntryCard component with %s', (artifactType, generateItem) => {
  let item: AnyArtifact;
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactEntryCollapsibleCardProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let handleOnExpandCollapse: jest.MockedFunction<
    ArtifactEntryCollapsibleCardProps['onExpandCollapse']
  >;

  beforeEach(() => {
    item = generateItem();
    appTestContext = createAppRootMockRenderer();
    handleOnExpandCollapse = jest.fn();
    render = (props = {}) => {
      const cardProps: ArtifactEntryCollapsibleCardProps = {
        item,
        onExpandCollapse: handleOnExpandCollapse,
        'data-test-subj': 'testCard',
        ...props,
      };

      renderResult = appTestContext.render(<ArtifactEntryCollapsibleCard {...cardProps} />);
      return renderResult;
    };
  });

  it.each([
    ['expandCollapse button', 'testCard-header-expandCollapse'],
    ['name', 'testCard-header-titleHolder'],
    ['description', 'testCard-header-descriptionHolder'],
    ['assignment', 'testCard-header-effectScope'],
  ])('should show %s', (__, testSubjId) => {
    render();

    expect(renderResult.getByTestId(testSubjId)).not.toBeNull();
  });

  it('should NOT show actions menu if none are defined', async () => {
    render();

    expect(renderResult.queryByTestId('testCard-header-actions')).toBeNull();
  });

  it('should render card collapsed', () => {
    render();

    expect(renderResult.queryByTestId('testCard-header-criteriaConditions')).toBeNull();
  });

  it('should render card expanded', () => {
    render({ expanded: true });

    expect(renderResult.getByTestId('testCard-criteriaConditions')).not.toBeNull();
  });

  it('should display tooltip if collapsed', () => {
    render();

    expect(renderResult.baseElement.querySelectorAll('.euiToolTipAnchor')).toHaveLength(3);
  });

  it('should display tooltip when collapsed but only if not empty', () => {
    item.description = '';
    render();

    expect(renderResult.baseElement.querySelectorAll('.euiToolTipAnchor')).toHaveLength(2);
  });

  it('should NOT display a tooltip if expanded', () => {
    render({ expanded: true });

    expect(renderResult.baseElement.querySelectorAll('.euiToolTipAnchor')).toHaveLength(1);
  });

  it('should call `onExpandCollapse` callback when button is clicked', () => {
    render();
    act(() => {
      fireEvent.click(renderResult.getByTestId('testCard-header-expandCollapse'));
    });

    expect(handleOnExpandCollapse).toHaveBeenCalled();
  });

  it.each([
    ['title', 'testCard-header-titleHolder'],
    ['description', 'testCard-header-descriptionHolder'],
  ])('should truncate %s text when collapsed', (__, testSubjId) => {
    render();

    expect(renderResult.getByTestId(testSubjId).classList.contains('eui-textTruncate')).toBe(true);
  });

  it.each([
    ['title', 'testCard-header-titleHolder'],
    ['description', 'testCard-header-descriptionHolder'],
  ])('should NOT truncate %s text when expanded', (__, testSubjId) => {
    render({ expanded: true });

    expect(renderResult.getByTestId(testSubjId).classList.contains('eui-textTruncate')).toBe(false);
  });

  it('should pass item to decorator function and display its result when expanded', () => {
    let passedItem: ArtifactEntryCardDecoratorProps['item'] | null = null;
    const MockDecorator = memo<ArtifactEntryCardDecoratorProps>(({ item: actualItem }) => {
      passedItem = actualItem;
      return <p>{'mock decorator'}</p>;
    });
    MockDecorator.displayName = 'MockDecorator';

    render({ Decorator: MockDecorator, expanded: true });

    expect(renderResult.getByText('mock decorator')).toBeInTheDocument();
    expect(passedItem).toBe(item);
  });

  it('should not display decorator when collapsed', () => {
    let passedItem: ArtifactEntryCardDecoratorProps['item'] | null = null;
    const MockDecorator = memo<ArtifactEntryCardDecoratorProps>(({ item: actualItem }) => {
      passedItem = actualItem;
      return <p>{'mock decorator'}</p>;
    });
    MockDecorator.displayName = 'MockDecorator';

    render({ Decorator: MockDecorator, expanded: false });

    expect(renderResult.queryByText('mock decorator')).not.toBeInTheDocument();
    expect(passedItem).toBe(null);
  });

  it('should not show an enabled status by default', () => {
    render();

    expect(renderResult.queryByTestId('testCard-header-enabledStatus')).toBeNull();
  });

  it('should show Enabled when showEnabledColumn is set', () => {
    render({ showEnabledColumn: true });

    expect(renderResult.getByTestId('testCard-header-enabledStatus')).toHaveTextContent('Enabled');
  });

  if (artifactType === 'exceptions/event filters') {
    it('should show Disabled when the artifact has the disabled tag', () => {
      (item as unknown as ArtifactInfo).tags = [
        ...(item as unknown as ArtifactInfo).tags,
        DISABLED_ARTIFACT_TAG,
      ];

      render({ showEnabledColumn: true });

      expect(renderResult.getByTestId('testCard-header-enabledStatus')).toHaveTextContent(
        'Disabled'
      );
    });
  }

  it('should replace criteria conditions when CriteriaComponent is provided', () => {
    const MockCriteria = memo<CriteriaConditionsProps>(() => <p>{'custom criteria'}</p>);
    MockCriteria.displayName = 'MockCriteria';

    render({ CriteriaComponent: MockCriteria, expanded: true });

    expect(renderResult.getByText('custom criteria')).toBeInTheDocument();
    expect(renderResult.queryByTestId('testCard-criteriaConditions-condition')).toBeNull();
  });
});
