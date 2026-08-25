/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../../../common/constants';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useGetSecuritySolutionLinkProps } from '../../../common/components/links';
import { RiskScoreHeaderContent } from './header_content';

jest.mock('../../../common/components/links', () => {
  const actual = jest.requireActual('../../../common/components/links');
  return {
    ...actual,
    useGetSecuritySolutionLinkProps: jest.fn(),
  };
});
const mockGetSecuritySolutionLinkProps = jest
  .fn()
  .mockReturnValue({ onClick: jest.fn(), href: '/test' });

const defaultProps = {
  entityLinkProps: {
    deepLinkId: SecurityPageName.users,
    onClick: jest.fn(),
    path: '/userRisk',
  },
  onSelectSeverityFilter: jest.fn(),
  riskEntity: EntityType.user,
  selectedSeverity: [],
  toggleStatus: true,
};

describe('RiskScoreHeaderContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetSecuritySolutionLinkProps as jest.Mock).mockReturnValue(
      mockGetSecuritySolutionLinkProps
    );
  });

  it('should render when toggleStatus = true', () => {
    const res = render(<RiskScoreHeaderContent {...defaultProps} />);
    expect(res.getByTestId(`user-risk-score-header-content`)).toBeInTheDocument();
  });

  it('should render learn more button', () => {
    const res = render(<RiskScoreHeaderContent {...defaultProps} />);
    expect(res.getByText(`How is risk score calculated?`)).toBeInTheDocument();
  });

  it('should render severity filter group', () => {
    const res = render(<RiskScoreHeaderContent {...defaultProps} />);
    expect(res.getByTestId(`risk-filter`)).toBeInTheDocument();
  });

  it('should render view all button', () => {
    const res = render(<RiskScoreHeaderContent {...defaultProps} />);
    expect(res.getByTestId(`view-all-button`)).toBeInTheDocument();
  });

  it('should not render if toggleStatus = false', () => {
    const res = render(<RiskScoreHeaderContent {...defaultProps} toggleStatus={false} />);
    expect(res.queryByTestId(`view-all-button`)).not.toBeInTheDocument();
  });

  it('should render when entity type is service', () => {
    const res = render(
      <RiskScoreHeaderContent {...defaultProps} riskEntity={EntityType.service} />
    );
    expect(res.getByTestId(`service-risk-score-header-content`)).toBeInTheDocument();
  });
});
