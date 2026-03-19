/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from '@emotion/styled';
import { FormattedCount } from '../../../../common/components/formatted_number';

interface ChartLabelProps {
  count: number | null | undefined;
  onClick?: () => void;
}

const PlaceHolder = styled.div`
  padding: ${(props) => props.theme.euiTheme.size.s};
`;

const ChartLabelComponent: React.FC<ChartLabelProps> = ({ count, onClick }) => {
  const onLabelClick = useCallback(() => onClick && onClick(), [onClick]);

  if (count) {
    return onClick ? (
      <EuiLink onClick={onLabelClick}>
        <b>
          <FormattedCount count={count} />
        </b>
      </EuiLink>
    ) : (
      <b>
        <FormattedCount count={count} />
      </b>
    );
  }
  return <PlaceHolder />;
};

ChartLabelComponent.displayName = 'ChartLabelComponent';
export const ChartLabel = React.memo(ChartLabelComponent);
