/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ComponentType,
  ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { useHistory } from 'react-router-dom';
import { generateNavEvents, NavEvent } from './nav_events';
import { generatePath } from './path';

type Entry<T> = { [K in keyof T]: [K, T[K]] }[keyof T];

export interface WizardContext<T, StepKey extends string> {
  setCurrentStep: (step: StepKey) => void;
  goToStep: (step: StepKey) => void;
  goBack: () => void;
  getState: () => T;
  setState: (state: T | ((prevState: T) => T)) => void;
  getPath: () => StepKey[];
  getUsage: () => {
    timeSinceStart: number;
    navEvents: Array<{
      type: string;
      step: StepKey;
      timestamp: number;
      duration: number;
    }>;
  };
}

export interface Step {
  component: ComponentType;
  title?: string;
}

export function createWizardContext<T, StepKey extends string, InitialStepKey extends StepKey>({
  initialState,
  initialStep,
  steps,
  basePath,
}: {
  initialState: T;
  initialStep: InitialStepKey;
  steps: Record<StepKey, Step>;
  basePath: string;
}) {
  const context = createContext<WizardContext<T, StepKey>>({
    setCurrentStep: () => {},
    goToStep: () => {},
    goBack: () => {},
    getState: () => initialState,
    setState: () => {},
    getPath: () => [],
    getUsage: () => ({
      timeSinceStart: 0,
      navEvents: new Array<NavEvent<StepKey>>(),
    }),
  });

  const stepRoute = (stepKey: StepKey) =>
    stepKey === initialStep ? basePath : `${basePath}/${stepKey}`;

  const routes = Object.entries(steps).reduce((acc, pair) => {
    const [key, value] = pair as Entry<Record<StepKey, Step>>;
    return {
      ...acc,
      [stepRoute(key)]: {
        exact: true,
        handler: () =>
          Page({
            step: key,
            Component: value.component,
          }),
      },
    };
  }, {});

  function Page({ step, Component }: { step: StepKey; Component: ComponentType }) {
    const { setCurrentStep } = useWizard();
    useEffect(() => {
      setCurrentStep(step);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    return <Component />;
  }

  function Provider({
    children,
    onChangeStep,
    transitionDuration,
  }: {
    children: ReactNode;
    onChangeStep?: (stepChangeEvent: {
      direction: 'back' | 'next';
      stepKey: StepKey;
      stepTitle?: string;
      StepComponent: ComponentType;
    }) => void;
    transitionDuration?: number;
  }) {
    const history = useHistory();
    const [step, setStep] = useState<StepKey>();
    const pathRef = useRef<StepKey[]>([]);
    const usageRef = useRef<ReturnType<WizardContext<T, StepKey>['getUsage']>>({
      timeSinceStart: 0,
      navEvents: new Array<NavEvent<StepKey>>(),
    });
    const [state, setState] = useState<T>(initialState);

    return (
      <context.Provider
        value={{
          setCurrentStep(stepKey: StepKey) {
            if (stepKey === step) {
              return;
            }

            setStep(stepKey);
            const stepVisited = pathRef.current.find((key) => key === stepKey);

            pathRef.current = generatePath({
              step: stepKey,
              path: pathRef.current,
            });

            usageRef.current.navEvents = generateNavEvents({
              type: stepVisited ? 'back' : 'progress',
              step: stepKey,
              navEvents: usageRef.current.navEvents as Array<NavEvent<StepKey>>,
            });

            if (onChangeStep) {
              onChangeStep({
                direction: stepVisited ? 'back' : 'next',
                stepKey,
                stepTitle: steps[stepKey].title,
                StepComponent: steps[stepKey].component,
              });
            }
          },
          goToStep(stepKey: StepKey) {
            if (stepKey === step) {
              return;
            }
            const stepUrl = stepRoute(stepKey);

            if (transitionDuration) {
              setTimeout(() => {
                history.push(stepUrl);
              }, transitionDuration);
            } else {
              history.push(stepUrl);
            }
          },
          goBack() {
            if (history.length === 1 || pathRef.current.length === 1 || !transitionDuration) {
              history.goBack();
            }

            setTimeout(() => {
              history.goBack();
            }, transitionDuration);
          },
          getState: () => state as T,
          setState: (_state: T | ((prevState: T) => T)) => {
            setState(_state);
          },
          getPath: () => [...pathRef.current],
          getUsage: () => {
            const currentTime = Date.now();
            const navEvents = usageRef.current.navEvents;
            const firstNavEvent = navEvents[0];
            const lastNavEvent = navEvents[navEvents.length - 1];
            lastNavEvent.duration = currentTime - lastNavEvent.timestamp;
            return {
              timeSinceStart: currentTime - firstNavEvent.timestamp,
              navEvents,
            };
          },
        }}
      >
        {children}
      </context.Provider>
    );
  }

  function useWizard() {
    return useContext(context);
  }

  return { context, Provider, useWizard, routes };
}
