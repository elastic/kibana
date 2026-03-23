/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface UseMetricAnimationProps {
  animationDurationMs?: number;
  selector?: string;
}

/**
 * Custom hook that animates a metric value in the DOM
 * Works by finding the target element and animating its text content
 * Prevents flash by immediately hiding elements and using mutation observer
 */
export const useMetricAnimation = ({
  animationDurationMs = 1500,
  selector = '.echMetricText__value',
}: UseMetricAnimationProps) => {
  const animationRef = useRef<d3.Selection<HTMLElement> | null>(null);
  const hasAnimatedRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    // Reset the animation flag for each render
    hasAnimatedRef.current = false;

    let elementFound = false;
    let animationStarted = false;
    let observer: MutationObserver | null = null;

    const startAnimation = (element: HTMLElement) => {
      if (animationStarted) return;
      animationStarted = true;

      // Store the original text content and styling
      const originalText = element.textContent || '';

      // Extract the numeric value from the text (remove currency symbols, commas, etc.)
      const numericValue = parseFloat(originalText.replace(/[^0-9.-]/g, ''));

      if (isNaN(numericValue)) {
        if (observer) {
          observer.disconnect();
        }
        return;
      }

      // Immediately hide the element to prevent flash
      element.style.opacity = '0';

      // Add a small delay to ensure the element is fully styled
      setTimeout(() => {
        // Show the element and start animation
        element.style.opacity = '1';

        // Set initial animated value
        element.textContent = '$0';

        // Animate the counter directly on the original element
        const selection = d3.select(element);
        selection
          .transition()
          .duration(animationDurationMs)
          .tween('text', function (this: HTMLElement) {
            const interpolator = d3.interpolateNumber(0, numericValue);

            return (t: number) => {
              const currentValue = Math.round(interpolator(t));
              // Format the number with currency symbol and commas
              const formattedValue = `$${currentValue.toLocaleString()}`;
              this.textContent = formattedValue;
            };
          });

        // Handle the end of animation using setTimeout instead of transition.on
        setTimeout(() => {
          // Restore original text content
          element.textContent = originalText;

          // Restore opacity
          element.style.opacity = '';

          if (observer) {
            observer.disconnect();
          }
          hasAnimatedRef.current = true;
        }, animationDurationMs);

        animationRef.current = selection;
      }, 100); // 100ms delay to ensure element is fully styled
    };

    // First, check if the element already exists
    const checkExistingElement = () => {
      const existingElement = document.querySelector(selector) as HTMLElement;
      if (existingElement && !elementFound && !animationStarted) {
        elementFound = true;
        startAnimation(existingElement);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkExistingElement()) {
      return;
    }

    // Set up a mutation observer to catch new elements as they're added
    observer = new MutationObserver((mutations) => {
      if (animationStarted) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const targetElement = element.querySelector(selector) as HTMLElement;
            if (targetElement && !elementFound) {
              elementFound = true;
              startAnimation(targetElement);
            }
            // Also check if the node itself is the target
            if (element.matches && element.matches(selector) && !elementFound) {
              elementFound = true;
              startAnimation(element as HTMLElement);
            }
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    observerRef.current = observer;

    // Fallback: check for existing element after a short delay
    const fallbackTimeout = setTimeout(() => {
      if (!elementFound && !animationStarted) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          elementFound = true;
          startAnimation(element);
        }
      }
    }, 50); // Reduced from 200ms to 50ms for faster detection

    return () => {
      clearTimeout(fallbackTimeout);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (animationRef.current) {
        animationRef.current.interrupt();
      }
    };
  }, [animationDurationMs, selector]);
};
