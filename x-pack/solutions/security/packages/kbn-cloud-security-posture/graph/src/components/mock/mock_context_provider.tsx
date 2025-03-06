/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';

interface MockData {
  useFetchGraphDataMock?: {
    log?: (...args: unknown[]) => void;
    isFetching?: boolean;
    refresh?: () => void;
  };
}

const MockDataContext = createContext<{
  data: MockData;
  setData: (newData: MockData) => void;
} | null>(null);

interface MockDataProviderProps {
  data?: MockData;
  children: React.ReactNode;
}

export const MockDataProvider = ({ children, data = {} }: MockDataProviderProps) => {
  const [mockData, setMockData] = useState<MockData>(data);

  // Synchronize data prop with state
  React.useEffect(() => {
    setMockData({ ...data });
  }, [data]);

  return (
    <MockDataContext.Provider value={{ data: mockData, setData: setMockData }}>
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockDataContext = () => {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockDataContext must be used within a MockDataProvider');
  }
  return context;
};
