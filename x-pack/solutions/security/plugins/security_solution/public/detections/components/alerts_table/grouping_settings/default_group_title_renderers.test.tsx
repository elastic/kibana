/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  defaultGroupTitleRenderers,
  GroupWithIconContent,
  RULE_NAME_GROUP_DESCRIPTION_TEST_ID,
  RULE_NAME_GROUP_TAG_TEST_ID,
  RULE_NAME_GROUP_TAGS_TEST_ID,
  RULE_NAME_GROUP_TEST_ID,
  RULE_NAME_GROUP_TITLE_TEST_ID,
  RuleNameGroupContent,
} from '.';
import { render } from '@testing-library/react';

describe('defaultGroupTitleRenderers', () => {
  it('should render correctly for kibana.alert.rule.name field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'kibana.alert.rule.name',
        {
          key: ['Rule name test', 'Some description'],
          doc_count: 10,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId(RULE_NAME_GROUP_TEST_ID)).toBeInTheDocument();
  });

  it('should render correctly for host.name field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'host.name',
        {
          key: 'Host',
          doc_count: 2,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('host-name-group-renderer')).toBeInTheDocument();
  });

  it('should render correctly for user.name field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'user.name',
        {
          key: 'User test',
          doc_count: 1,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('user-name-group-renderer')).toBeInTheDocument();
  });

  it('should render correctly for source.ip field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'source.ip',
        {
          key: 'sourceIp',
          doc_count: 23,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('source-ip-group-renderer')).toBeInTheDocument();
  });

  it('should return undefined when the renderer does not exist', () => {
    const wrapper = defaultGroupTitleRenderers(
      'process.name',
      {
        key: 'process',
        doc_count: 10,
      },
      'This is a null group!'
    );

    expect(wrapper).toBeUndefined();
  });
});

describe('RuleNameGroupContent', () => {
  it('should render component', () => {
    const { getByTestId, queryByTestId } = render(
      <RuleNameGroupContent ruleName="rule_name" ruleDescription="rule_description" />
    );

    expect(getByTestId(RULE_NAME_GROUP_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_NAME_GROUP_TITLE_TEST_ID)).toHaveTextContent('rule_name');
    expect(getByTestId(RULE_NAME_GROUP_DESCRIPTION_TEST_ID)).toHaveTextContent('rule_description');
    expect(queryByTestId(RULE_NAME_GROUP_TAGS_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RULE_NAME_GROUP_TAG_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render component with tags', () => {
    const { getByTestId } = render(
      <RuleNameGroupContent
        ruleName="rule_name"
        ruleDescription="rule_description"
        tags={[
          {
            key: 'key',
            doc_count: 2,
          },
        ]}
      />
    );

    expect(getByTestId(RULE_NAME_GROUP_TAGS_TEST_ID)).toBeInTheDocument();
  });
});

describe('GroupWithIconContent', () => {
  it('should render component with icon', () => {
    const { getByTestId, queryByTestId } = render(
      <GroupWithIconContent title="title" icon="icon" dataTestSubj="test_id" />
    );

    expect(getByTestId('test_id-group-renderer')).toBeInTheDocument();
    expect(getByTestId('test_id-group-renderer-icon')).toBeInTheDocument();
    expect(getByTestId('test_id-group-renderer-title')).toHaveTextContent('title');
    expect(queryByTestId('test_id-group-renderer-null-message')).not.toBeInTheDocument();
  });

  it('should render null message information icon', () => {
    const { getByTestId } = render(
      <GroupWithIconContent
        title="title"
        icon="icon"
        nullGroupMessage="null_message"
        dataTestSubj="test_id"
      />
    );

    expect(getByTestId('test_id-group-renderer-null-message')).toBeInTheDocument();
  });
});
