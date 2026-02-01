'use client';

import { useState, useEffect, RefObject } from 'react';

/**
 * Hook to track the width of a container element using ResizeObserver.
 * Returns the current width of the container.
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Set initial width
    setWidth(element.clientWidth);

    // Create ResizeObserver to track width changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Use contentBoxSize for more accurate measurements
          const boxSize = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize;
          setWidth(boxSize.inlineSize);
        } else {
          // Fallback for older browsers
          setWidth(entry.contentRect.width);
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return width;
}
