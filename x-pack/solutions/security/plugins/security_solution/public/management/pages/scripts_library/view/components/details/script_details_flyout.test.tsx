/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../../common/mock/endpoint';
import {
  EndpointScriptDetailsFlyout,
  type EndpointScriptDetailsFlyoutProps,
} from './script_details_flyout';
import { EndpointScriptsGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import { SORTED_SCRIPT_TAGS_KEYS } from '../../../../../../../common/endpoint/service/scripts_library/constants';

describe('EndpointScriptDetailsFlyout', () => {
  let render: (
    props?: EndpointScriptDetailsFlyoutProps
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  let defaultProps: EndpointScriptDetailsFlyoutProps;

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('script-details-flyout-test');
    mockedContext = createAppRootMockRenderer();

    defaultProps = {
      scriptItem: scriptsGenerator.generate({
        id: 'script-1',
        name: 'Script snippet',
        platform: ['linux', 'macos'],
        tags: [...SORTED_SCRIPT_TAGS_KEYS],
        updatedBy: 'elastic',
        updatedAt: '2026-02-04T12:23:37Z',
      }),
      onClickAction: jest.fn(),
      'data-test-subj': 'test',
    };

    render = (props?: EndpointScriptDetailsFlyoutProps) => {
      renderResult = mockedContext.render(
        <EndpointScriptDetailsFlyout {...(props ?? defaultProps)} />
      );
      return renderResult;
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    render();

    const { getByTestId } = renderResult;

    expect(getByTestId('test-header')).toBeInTheDocument();
    expect(getByTestId('test-body')).toBeInTheDocument();
    expect(getByTestId('test-footer')).toBeInTheDocument();
  });

  describe('header', () => {
    it('should show last updated info in header', () => {
      render();
      const { getByTestId } = renderResult;
      const lastUpdatedLabel = getByTestId('test-header-lastUpdatedLabel');
      expect(lastUpdatedLabel).toBeInTheDocument();
      expect(lastUpdatedLabel).toHaveTextContent('Last updated: Feb 4, 2026 @ 12:23:37.000');
    });

    it('should render script name in header', () => {
      render();
      const { getByTestId } = renderResult;
      const scriptNameTitle = getByTestId('test-header-scriptNameTitle');
      expect(scriptNameTitle).toBeInTheDocument();
      expect(scriptNameTitle).toHaveTextContent('Script snippet');
    });

    it('should show platform badges in header', () => {
      render();
      const { getByTestId } = renderResult;
      const platformBadges = getByTestId('test-header-platformBadges');
      const badges = platformBadges.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(2);
      badges.forEach((badge) => {
        expect(['Linux', 'Mac']).toContain(badge.textContent);
      });
    });
  });

  describe('body', () => {
    it('should render script details in body', () => {
      render();
      const { getByTestId } = renderResult;
      const body = getByTestId('test-body');
      expect(body).toBeInTheDocument();
    });

    it('should render all script details items in body', () => {
      render();
      const { getByTestId } = renderResult;
      const body = getByTestId('test-body');

      const detailItems = body.querySelectorAll('[data-test-subj^="test-body-detail-"]');
      expect(detailItems).toHaveLength(10);

      const detailLabels = Array.from(detailItems)
        .map((item) => {
          return item.querySelector('h5')?.textContent;
        })
        .join(', ');

      expect(detailLabels).toBe(
        'Requires user input, Types, Description, Instructions, Examples, File name, Path to executable file, File size, SHA256, Updated by'
      );
    });

    it('should render only non-empty script details items in body', () => {
      render({
        ...defaultProps,
        scriptItem: {
          ...defaultProps.scriptItem,
          tags: [],
          description: '',
          instructions: '',
          example: '',
          pathToExecutable: '',
        },
      });
      const { getByTestId } = renderResult;
      const body = getByTestId('test-body');

      const detailItems = body.querySelectorAll('[data-test-subj^="test-body-detail-"]');
      expect(detailItems).toHaveLength(5);

      const detailLabels = Array.from(detailItems)
        .map((item) => {
          return item.querySelector('h5')?.textContent;
        })
        .join(', ');

      expect(detailLabels).toBe('Requires user input, File name, File size, SHA256, Updated by');
    });
  });

  describe('footer', () => {
    it('should render', () => {
      render();
      const { getByTestId } = renderResult;
      const footer = getByTestId('test-footer');
      expect(footer).toBeInTheDocument();
    });

    it('should render take action button in footer', () => {
      render();
      const { getByTestId } = renderResult;
      const actionButton = getByTestId('test-footer-takeActionButton');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveTextContent('Take action');
    });
  });
});
