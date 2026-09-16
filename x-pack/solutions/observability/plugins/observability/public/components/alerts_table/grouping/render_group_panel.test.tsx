/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawBucket } from '@kbn/grouping/src';
import { render } from '../../../utils/test_helper';
import type { AlertsByGroupingAgg } from '../types';
import {
  renderGroupPanel,
  RULE_NAME_GROUP_TAGS_TEST_ID,
  RULE_NAME_GROUP_TEST_ID,
} from './render_group_panel';

const baseAgg = {
  groupByFields: {
    doc_count_error_upper_bound: 0,
    sum_other_doc_count: 0,
    buckets: [],
  },
  groupsCount: { value: 1 },
  unitsCount: { value: 3 },
};

const ruleNameBucket = (tags: string[]): RawBucket<AlertsByGroupingAgg> => ({
  key: ['APM Failed Transaction Rate'],
  doc_count: 3,
  ...baseAgg,
  ruleTags: {
    doc_count_error_upper_bound: 0,
    sum_other_doc_count: 0,
    buckets: tags.map((key) => ({ key, doc_count: 3 })),
  },
});

describe('renderGroupPanel', () => {
  it('renders rule name and tags on the same grouping row', () => {
    const { getByTestId, getByText } = render(
      renderGroupPanel('kibana.alert.rule.name', ruleNameBucket(['prod', 'apm', 'critical']))!
    );

    const group = getByTestId(RULE_NAME_GROUP_TEST_ID);
    const tags = getByTestId(RULE_NAME_GROUP_TAGS_TEST_ID);

    expect(group).toContainElement(tags);
    expect(group).toHaveTextContent('APM Failed Transaction Rate');
    expect(getByText('prod')).toBeInTheDocument();
    expect(getByText('apm')).toBeInTheDocument();
    expect(getByText('critical')).toBeInTheDocument();
  });

  it('does not render tags when the rule has none', () => {
    const { getByTestId, queryByTestId } = render(
      renderGroupPanel('kibana.alert.rule.name', ruleNameBucket([]))!
    );

    expect(getByTestId(RULE_NAME_GROUP_TEST_ID)).toHaveTextContent('APM Failed Transaction Rate');
    expect(queryByTestId(RULE_NAME_GROUP_TAGS_TEST_ID)).not.toBeInTheDocument();
  });
});
