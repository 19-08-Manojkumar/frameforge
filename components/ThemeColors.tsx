"use client";
import { useEffect, useId, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import {
  createDefaultThemeCustomizations,
  THEME_SECTIONS,
} from "@/lib/themeCustomization";
import type { ThemeCustomization, ThemeId } from "@/types/collage";

function ColorField({
  label,
  name,
  value,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId(),
    [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = (text: string) => /^#?[a-f\d]{6}$/i.test(text);
  return (
    <div className="theme-color-row">
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          type="color"
          aria-label={`${name} color`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="color-hex"
          type="text"
          aria-label={`${name} color hex`}
          spellCheck={false}
          maxLength={7}
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            if (valid(text))
              onChange(`#${text.replace(/^#/, "").toLowerCase()}`);
          }}
          onBlur={() => {
            if (/^#?[a-f\d]{3}$/i.test(draft)) {
              onChange(
                `#${draft
                  .replace(/^#/, "")
                  .split("")
                  .map((c) => c + c)
                  .join("")
                  .toLowerCase()}`,
              );
            } else if (!valid(draft)) setDraft(value);
            else setDraft(`#${draft.replace(/^#/, "").toLowerCase()}`);
          }}
        />
      </div>
    </div>
  );
}

export function ThemeColors({
  theme,
  customization,
  onChange,
  disabled,
}: {
  theme: ThemeId;
  customization: ThemeCustomization;
  onChange: (patch: Partial<ThemeCustomization>) => void;
  disabled: boolean;
}) {
  const section = THEME_SECTIONS[theme];
  const gapDefault = [
    "scenic-fan",
    "torn-travel",
    "polaroid",
    "scrapbook",
    "travel-journal",
    "retro-vintage",
    "postcard-stack",
  ].includes(theme)
    ? "#fffef5"
    : customization.backgroundColor;
  return (
    <section className="theme-colors" aria-label="Theme colors">
      <div className="theme-colors-heading">
        <h3>
          <Palette size={14} aria-hidden="true" /> Theme colors
        </h3>
        <button
          disabled={disabled}
          aria-label="Reset theme colors"
          onClick={() => {
            const original = createDefaultThemeCustomizations()[theme];
            onChange({
              backgroundColor: original.backgroundColor,
              backgroundCustomized: false,
              gapColor: null,
              sectionColor: null,
            });
          }}
        >
          <RotateCcw size={11} aria-hidden="true" /> Reset
        </button>
      </div>
      <ColorField
        label="Background"
        name="Background"
        value={customization.backgroundColor}
        disabled={disabled}
        onChange={(backgroundColor) =>
          onChange({ backgroundColor, backgroundCustomized: true })
        }
      />
      <ColorField
        label="Photo gaps"
        name="Gap"
        value={customization.gapColor ?? gapDefault}
        disabled={disabled}
        onChange={(gapColor) => onChange({ gapColor })}
      />
      {section && (
        <ColorField
          label={section.label}
          name="Section"
          value={customization.sectionColor ?? section.color}
          disabled={disabled}
          onChange={(sectionColor) => onChange({ sectionColor })}
        />
      )}
      <p>
        {theme === "scenic-fan"
          ? "Background = outer border. Below photos = title panel."
          : "Change the canvas and photo separators. Reset restores the original finish."}
      </p>
    </section>
  );
}
