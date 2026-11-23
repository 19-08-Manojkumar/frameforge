"use client";
import { useState } from "react";
import { MapPin, CalendarDays, Quote } from "lucide-react";
import {
  CAPTION_SUGGESTIONS,
  TRAVEL_TEMPLATES,
  type TravelCollection,
  type TravelDetails,
} from "@/lib/travelTemplates";
import type { ThemeId } from "@/types/collage";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";

export function TravelDetailsForm({
  theme,
  details,
  collection,
  disabled,
  onChange,
}: {
  theme: ThemeId;
  details: TravelDetails;
  collection: TravelCollection;
  disabled: boolean;
  onChange: (field: keyof TravelDetails, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(
    !!(
      details.destination ||
      details.date ||
      details.caption ||
      details.origin
    ),
  );
  if (!TRAVEL_TEMPLATES[theme]) return null;
  return (
    <details
      className="trip-details-form"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        <MapPin size={14} /> Your trip details <span>Optional</span>
      </summary>
      <div className="trip-fields">
        <label>
          Destination
          <input
            aria-label="Trip destination"
            placeholder="e.g. Goa"
            maxLength={60}
            value={details.destination}
            disabled={disabled}
            onChange={(e) => onChange("destination", e.target.value)}
          />
        </label>
        {!!TRAVEL_TEMPLATES[theme]?.origin && (
          <label>
            Starting from
            <input
              aria-label="Trip starting point"
              placeholder="e.g. Mumbai"
              maxLength={60}
              value={details.origin}
              disabled={disabled}
              onChange={(e) => onChange("origin", e.target.value)}
            />
          </label>
        )}
        <label>
          <span>
            <CalendarDays size={12} /> Trip date
          </span>
          <input
            aria-label="Trip date"
            type="date"
            value={details.date}
            disabled={disabled}
            onChange={(e) => onChange("date", e.target.value)}
          />
        </label>
        <label className="trip-caption-field">
          Caption
          <AutoGrowTextarea
            aria-label="Trip caption"
            rows={2}
            maxLength={100}
            value={details.caption}
            placeholder="A little escape. A lasting memory."
            disabled={disabled}
            onChange={(e) => onChange("caption", e.target.value)}
          />
        </label>
        <div
          className="caption-suggestions"
          role="group"
          aria-label="Caption suggestions"
        >
          {CAPTION_SUGGESTIONS[collection].map((caption) => (
            <button
              key={caption}
              disabled={disabled}
              type="button"
              onClick={() => onChange("caption", caption)}
            >
              <Quote size={11} aria-hidden="true" /> {caption}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
