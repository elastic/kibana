/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { sloKeys } from '../../../hooks/query_key_factory';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../hooks/use_kibana';

interface BulkOperationTask {
  taskId: string;
  operation: 'delete';
  status: 'in-progress' | 'completed' | 'failed';
  items: Array<{ id: string; success: boolean; error?: string }>;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

interface RegisterBulkOperationTask {
  taskId: string;
  operation: 'delete';
  items: Array<{ id: string }>;
}

interface BulkOperationContext {
  tasks: BulkOperationTask[];
  register: (task: RegisterBulkOperationTask) => void;
}

export const useBulkOperation = (): BulkOperationContext => {
  const context = useContext(BulkOperationContext);
  if (!context) {
    throw new Error('useBulkOperation must be used within a BulkOperationProvider');
  }
  return context;
};

const BulkOperationContext = createContext<BulkOperationContext | undefined>(undefined);

export function BulkOperationProvider({ children }: { children: React.ReactNode }) {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const { sloClient } = usePluginContext();

  const [tasks, setTasks] = useState<BulkOperationTask[]>([]);

  const register = useCallback((task: RegisterBulkOperationTask) => {
    setTasks((prevTasks) => [
      ...prevTasks,
      {
        ...task,
        items: task.items.map((item) => ({ ...item, success: false })),
        status: 'in-progress',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }, []);

  useQueries({
    queries: tasks
      .filter((task) => task.status === 'in-progress')
      .map((task) => ({
        queryKey: sloKeys.bulkDeleteStatus(task.taskId),
        queryFn: async () => {
          const response = await sloClient.fetch(
            'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31',
            { params: { path: { taskId: task.taskId } } }
          );

          if (!response.isDone) {
            setTasks((prevTasks) =>
              prevTasks.map((prevTask) => {
                if (prevTask.taskId === task.taskId) {
                  return {
                    ...prevTask,
                    status: 'in-progress',
                    updatedAt: new Date(),
                  };
                }
                return prevTask;
              })
            );

            return response;
          }

          queryClient.invalidateQueries({ queryKey: sloKeys.allDefinitions(), exact: false });

          if (!!response.error) {
            setTasks((prevTasks) =>
              prevTasks.map((prevTask) => {
                if (prevTask.taskId === task.taskId) {
                  return {
                    ...prevTask,
                    items: prevTask.items.map((item) => ({
                      ...item,
                      success: false,
                      error: response.error,
                    })),
                    status: 'failed',
                    error: response.error,
                    updatedAt: new Date(),
                  };
                }
                return prevTask;
              })
            );

            toasts.addError(new Error(response.error), {
              title: `Bulk ${task.operation} failed`,
            });

            return response;
          }

          setTasks((prevTasks) =>
            prevTasks.map((prevTask) => {
              if (prevTask.taskId === task.taskId) {
                return {
                  ...prevTask,
                  items: prevTask.items.map((item) => {
                    const result = response.results?.find((i) => i.id === item.id);
                    return {
                      ...item,
                      success: result?.success ?? false,
                      error: result?.error,
                    };
                  }),
                  status: 'completed',
                  updatedAt: new Date(),
                };
              }
              return prevTask;
            })
          );

          toasts.addSuccess({
            title: `Bulk ${task.operation} completed`,
            text: `Successfully deleted ${response.results?.filter((i) => i.success).length} on ${
              response.results?.length
            } SLOs`,
          });

          return response;
        },
        refetchInterval: 3000,
        retry: false,
        refetchOnWindowFocus: false,
      })),
  });

  return (
    <BulkOperationContext.Provider value={{ register, tasks }}>
      {children}
    </BulkOperationContext.Provider>
  );
}
