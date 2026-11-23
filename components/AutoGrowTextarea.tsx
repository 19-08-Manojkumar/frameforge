"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

/** Keep wording visible as it wraps, including when a collapsed panel opens. */
export const AutoGrowTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { resizeKey?: string }
>(function AutoGrowTextarea(
  { className = "", value, rows = 2, resizeKey, ...props },
  ref,
) {
  const field = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => field.current!);
  const resize = useCallback(() => {
    const element = field.current;
    if (!element || !element.clientWidth) return;
    const style = getComputedStyle(element);
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)}px`;
  }, []);
  useLayoutEffect(resize, [resize, value, rows, resizeKey]);
  useEffect(() => {
    const element = field.current!;
    let previousWidth = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== previousWidth) {
        previousWidth = entry.contentRect.width;
        resize();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [resize]);
  return (
    <textarea
      {...props}
      ref={field}
      className={`auto-grow-textarea ${className}`}
      rows={rows}
      value={value}
    />
  );
});
