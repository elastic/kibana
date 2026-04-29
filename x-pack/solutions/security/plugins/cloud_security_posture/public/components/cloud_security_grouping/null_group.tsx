/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const NullGroup = ({
  title,
  field,
  unit,
}: {
  title: string;
  field: string;
  unit: string;
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <strong>{title}</strong>
      <EuiIconTip
        anchorProps={{
          css: css`
            display: inline-flex;
          `,
        }}
        content={
          <>
            <FormattedMessage
              id="xpack.csp.grouping.nullGroupTooltip"
              defaultMessage="The selected {groupingTitle} field, {field} is missing a value for this group of {unit}."
              values={{
                groupingTitle: (
                  <strong>
                    <FormattedMessage
                      id="xpack.csp.grouping.nullGroupTooltip.groupingTitle"
                      defaultMessage="group by"
                    />
                  </strong>
                ),
                field: <code>{field}</code>,
                unit,
              }}
            />
          </>
        }
        position="right"
      />
    </EuiFlexGroup>
  );
};
