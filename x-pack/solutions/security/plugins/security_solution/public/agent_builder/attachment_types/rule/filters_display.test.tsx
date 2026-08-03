/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { FiltersDisplay, getFilterLabel } from './filters_display';

describe('getFilterLabel', () => {
  describe('alias handling', () => {
    it('ignores key and type when alias is present', () => {
      const filter: Filter = {
        meta: { alias: 'Alias wins', key: 'host.name', type: 'phrase', value: 'ignored' },
      };
      expect(getFilterLabel(filter)).toBe('Alias wins');
    });
  });

  describe('phrase type', () => {
    it('handles numeric params.query', () => {
      const filter: Filter = {
        meta: { key: 'http.response.status_code', type: 'phrase', params: { query: 404 } },
      };
      expect(getFilterLabel(filter)).toBe('http.response.status_code: 404');
    });

    it('handles boolean params.query', () => {
      const filter: Filter = {
        meta: { key: 'event.ingested', type: 'phrase', params: { query: true } },
      };
      expect(getFilterLabel(filter)).toBe('event.ingested: true');
    });
  });

  describe('phrases type', () => {
    it('prepends NOT for negated phrases filter', () => {
      const filter: Filter = {
        meta: { key: 'status', negate: true, type: 'phrases', params: ['active', 'pending'] },
      };
      expect(getFilterLabel(filter)).toBe('NOT status: active, pending');
    });
  });

  describe('range type', () => {
    it('formats open-ended upper bound with lte only', () => {
      const filter: Filter = {
        meta: { key: 'risk_score', type: 'range', params: { lte: 100 } },
      };
      expect(getFilterLabel(filter)).toBe('risk_score: <= 100');
    });

    it('formats open-ended upper bound with lt only', () => {
      const filter: Filter = {
        meta: { key: 'risk_score', type: 'range', params: { lt: 100 } },
      };
      expect(getFilterLabel(filter)).toBe('risk_score: < 100');
    });

    it('prefers lte over lt when both are present', () => {
      const filter: Filter = {
        meta: { key: 'bytes', type: 'range', params: { lte: 500, lt: 501 } },
      };
      expect(getFilterLabel(filter)).toBe('bytes: <= 500');
    });

    it('prepends NOT for negated range filter', () => {
      const filter: Filter = {
        meta: { key: 'bytes', negate: true, type: 'range', params: { gte: 100, lte: 500 } },
      };
      expect(getFilterLabel(filter)).toBe('NOT bytes: >= 100 AND <= 500');
    });
  });

  describe('missing key fallback', () => {
    it('prepends NOT for negated filter with no key', () => {
      const filter: Filter = { meta: { negate: true }, query: { match_all: {} } };
      expect(getFilterLabel(filter)).toBe('NOT {"match_all":{}}');
    });
  });

  describe('unknown/custom type fallback', () => {
    it('shows key with value from meta.value', () => {
      const filter: Filter = {
        meta: { key: 'event.action', type: 'custom', value: 'login' },
      };
      expect(getFilterLabel(filter)).toBe('event.action: login');
    });
  });
});

describe('FiltersDisplay', () => {
  it('renders nothing when all filters are invalid (no meta property)', () => {
    const filters = [{ something: 'else' }, { query: { match_all: {} } }];
    const { container } = render(<FiltersDisplay filters={filters} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders range filter in badge', () => {
    const filters = [{ meta: { key: 'bytes', type: 'range', params: { gte: 100, lte: 500 } } }];

    render(<FiltersDisplay filters={filters} />);

    expect(screen.getByText('bytes: >= 100 AND <= 500')).toBeInTheDocument();
  });
});
