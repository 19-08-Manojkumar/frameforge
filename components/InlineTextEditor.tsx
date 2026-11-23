"use client";
import { useLayoutEffect, useRef } from "react";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";

/** Native editing at the text's canvas anchor, sized by the wording itself. */
export function InlineTextEditor({
  text,
  disabled,
  contentOffset,
  resizeKey,
  onChange,
  onFinish,
}: {
  text: string;
  disabled: boolean;
  contentOffset: number;
  resizeKey: string;
  onChange: (text: string) => void;
  onFinish: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = field.current!;
    element.focus({ preventScroll: true });
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);
  return (
    <span className="inline-text-editor" data-inline-text-editor>
      <AutoGrowTextarea
        ref={field}
        className="inline-text-input"
        aria-label="Text content"
        aria-describedby="inline-text-help"
        value={text}
        maxLength={140}
        rows={1}
        wrap="soft"
        style={{ top: contentOffset }}
        resizeKey={resizeKey}
        spellCheck
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (
            !event.nativeEvent.isComposing &&
            (event.key === "Escape" ||
              (event.key === "Enter" && (event.ctrlKey || event.metaKey)))
          ) {
            event.preventDefault();
            event.stopPropagation();
            onFinish();
          }
        }}
      />
    </span>
  );
}
