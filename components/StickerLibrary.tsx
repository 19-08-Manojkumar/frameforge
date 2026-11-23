"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LoaderCircle,
  Search,
  X,
  Sticker,
  Smile,
  Spline,
  Sparkles,
  Plus,
  RotateCcw,
} from "lucide-react";
import { STICKERS, type StickerDefinition } from "@/lib/stickers";
import { flagAsset } from "@/lib/flagEmoji";
import { LinePreview } from "@/components/LinePreview";
import {
  LINE_PRESETS,
  LINE_COLLECTIONS,
  filterLinePresets,
} from "@/lib/lineCatalog";
import { CREATIVE_CHARMS } from "@/lib/creativeCharms";
import type { LineLayer, StickerStyle } from "@/types/collage";
import { StickerPreview } from "@/components/StickerPreview";
import { StickerStylePicker } from "@/components/StickerStylePicker";
import {
  EMOJI_COUNT,
  EMOJI_CATEGORIES,
  STICKER_CATEGORIES,
  filterEmoji,
  filterStickers,
  loadEmojiCatalog,
  type EmojiDefinition,
} from "@/lib/decorationCatalog";

type Collection = "stickers" | "emoji" | "lines" | "charms";

export function StickerLibrary({
  style,
  onStyleChange,
  onSticker,
  onEmoji,
  onLine,
  onClose,
  disabled,
  canAddSticker,
  canAddLine,
}: {
  style: StickerStyle;
  onStyleChange: (style: StickerStyle) => void;
  onSticker: (definition: StickerDefinition) => void;
  onEmoji: (emoji: string) => void;
  onLine: (preset: Omit<LineLayer, "id">) => void;
  onClose: () => void;
  disabled: boolean;
  canAddSticker: boolean;
  canAddLine: boolean;
}) {
  const [tab, setTab] = useState<Collection>("stickers");
  const [filters, setFilters] = useState<
    Record<Collection, { query: string; category: string }>
  >({
    stickers: { query: "", category: "All" },
    emoji: { query: "", category: "All" },
    lines: { query: "", category: "All" },
    charms: { query: "", category: "All" },
  });
  const { query, category } = filters[tab];
  const setQuery = (query: string) =>
    setFilters((current) => ({
      ...current,
      [tab]: { ...current[tab], query },
    }));
  const setCategory = (category: string) =>
    setFilters((current) => ({
      ...current,
      [tab]: { ...current[tab], category },
    }));
  const [emojiData, setEmojiData] = useState<EmojiDefinition[] | null>(null);
  const [emojiError, setEmojiError] = useState("");
  const [retry, setRetry] = useState(0);
  const [visibleCount, setVisibleCount] = useState(120);
  const filteredStickers = useMemo(
    () =>
      filterStickers(
        query,
        tab === "charms" ? "Creative Charms" : category,
      ).filter(
        (sticker) =>
          (tab === "charms") === (sticker.category === "Creative Charms") &&
          (tab !== "charms" ||
            category === "All" ||
            (sticker.collection ?? "Original collection") === category),
      ),
    [query, category, tab],
  );
  const filteredEmoji = useMemo(
    () => filterEmoji(emojiData ?? [], query, category),
    [emojiData, query, category],
  );
  const filteredLines = filterLinePresets(query, category);
  const count =
    tab === "stickers" || tab === "charms"
      ? filteredStickers.length
      : tab === "lines"
        ? filteredLines.length
        : filteredEmoji.length;
  const loading = tab === "emoji" && emojiData === null && !emojiError;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tab !== "emoji" || emojiData) return;
    let active = true;
    setEmojiError("");
    loadEmojiCatalog()
      .then((data) => {
        if (active) setEmojiData(data);
      })
      .catch(() => {
        if (active)
          setEmojiError("Emoji could not be loaded. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [tab, retry, emojiData]);
  useEffect(() => setVisibleCount(120), [tab, query, category]);
  const closeWithFocus = () => {
    root.current?.parentElement
      ?.querySelector<HTMLButtonElement>(".decoration-toggle")
      ?.focus();
    onClose();
  };
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>(".decoration-tabs button")
      ?.focus();
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target) &&
        !(
          event.target instanceof Element &&
          event.target.closest(".decoration-toggle")
        )
      )
        onClose();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [onClose]);
  return (
    <div
      ref={root}
      className="decoration-library"
      data-style-options={tab === "stickers" || tab === "charms"}
      role="dialog"
      aria-label="Add stickers and emoji"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeWithFocus();
        }
      }}
    >
      <div className="decoration-library-heading">
        <strong>A little personality</strong>
        <button aria-label="Close stickers and emoji" onClick={closeWithFocus}>
          <X size={15} />
        </button>
      </div>
      <div
        className="decoration-tabs"
        role="group"
        aria-label="Decoration type"
      >
        <button
          aria-pressed={tab === "stickers"}
          onClick={() => {
            setTab("stickers");
          }}
        >
          <Sticker size={13} aria-hidden="true" /> Stickers{" "}
          <span>{STICKERS.length - CREATIVE_CHARMS.length}</span>
        </button>
        <button
          aria-pressed={tab === "emoji"}
          onClick={() => {
            setTab("emoji");
          }}
        >
          <Smile size={13} aria-hidden="true" /> Emoji{" "}
          <span>{EMOJI_COUNT.toLocaleString()}</span>
        </button>
        <button
          aria-pressed={tab === "lines"}
          onClick={() => {
            setTab("lines");
          }}
        >
          <Spline size={13} aria-hidden="true" /> Lines{" "}
          <span>{LINE_PRESETS.length}</span>
        </button>
        <button
          aria-pressed={tab === "charms"}
          onClick={() => {
            setTab("charms");
          }}
        >
          <Sparkles size={13} aria-hidden="true" /> Creative Charms{" "}
          <span>{CREATIVE_CHARMS.length}</span>
        </button>
      </div>
      <label className="decoration-search">
        <Search size={14} />
        <input
          type="search"
          aria-label={`Search ${tab}`}
          placeholder={
            tab === "stickers"
              ? "Search routes, mountains, camera…"
              : tab === "emoji"
                ? "Search faces, places, food, flags…"
                : tab === "lines"
                  ? "Search torn paper, glitter, leaves…"
                  : "Search notes, notebooks, bows, travel…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {(tab === "stickers" || tab === "charms") && (
        <StickerStylePicker
          value={style}
          onChange={onStyleChange}
          sticker={
            filteredStickers[0] ??
            (tab === "charms" ? CREATIVE_CHARMS[0] : STICKERS[0])
          }
          disabled={disabled}
        />
      )}
      {
        <div className="decoration-filter-row">
          {tab === "charms" && (
            <select
              aria-label="Charm collection"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="All">All charms</option>
              {[
                "Notes & journals",
                "Travel & collage",
                "Playful accents",
                "Original collection",
              ].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          )}
          {tab === "lines" && (
            <select
              aria-label="Line collection"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="All">All lines</option>
              {LINE_COLLECTIONS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          )}
          {tab !== "charms" && tab !== "lines" && (
            <select
              aria-label={`${tab === "emoji" ? "Emoji" : "Sticker"} category`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="All">
                All {tab === "emoji" ? "emoji" : "stickers"}
              </option>
              {tab === "emoji" && <option value="Popular">Popular</option>}
              {(tab === "emoji"
                ? EMOJI_CATEGORIES
                : STICKER_CATEGORIES.filter((c) => c !== "Creative Charms")
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <span role="status" aria-live="polite">
            {loading ? "Loading…" : `${count.toLocaleString()} results`}
          </span>
        </div>
      }
      <div
        key={`${tab}:${category}:${query}`}
        className="decoration-results"
        role="group"
        aria-label={`Scrollable ${tab} gallery`}
        onScroll={(event) => {
          const el = event.currentTarget;
          if (
            tab === "emoji" &&
            el.scrollTop + el.clientHeight >= el.scrollHeight - 80
          )
            setVisibleCount((n) => Math.min(n + 120, filteredEmoji.length));
        }}
      >
        {loading && (
          <div className="decoration-empty">
            <LoaderCircle size={18} className="spin" /> Loading emoji…
          </div>
        )}
        {tab === "emoji" && emojiError && (
          <div className="decoration-empty" role="alert">
            {emojiError}
            <button onClick={() => setRetry((n) => n + 1)}>
              <RotateCcw size={12} aria-hidden="true" /> Try again
            </button>
          </div>
        )}
        <div
          className={`decoration-grid${tab === "lines" ? " decorative-line-grid" : tab === "charms" ? " creative-charm-grid" : ""}`}
        >
          {tab === "stickers" || tab === "charms"
            ? filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  disabled={disabled || !canAddSticker}
                  title={sticker.name}
                  aria-label={`Add ${sticker.name} sticker`}
                  onClick={() => onSticker(sticker)}
                >
                  <StickerPreview sticker={sticker} style={style} />
                  <span>{sticker.name}</span>
                </button>
              ))
            : tab === "lines"
              ? filteredLines.map(({ name, layer }, index) => (
                  <button
                    key={`${name}:${index}`}
                    className={
                      layer.effect?.startsWith("paper-")
                        ? "paper-divider-card"
                        : undefined
                    }
                    disabled={disabled || !canAddLine}
                    title={name}
                    aria-label={`Add ${name}`}
                    onClick={() => onLine(layer)}
                  >
                    <LinePreview line={layer} />
                    <span>{name}</span>
                  </button>
                ))
              : filteredEmoji.slice(0, visibleCount).map(({ emoji, name }) => (
                  <button
                    key={emoji}
                    disabled={disabled || !canAddSticker}
                    title={name}
                    aria-label={`Add ${name} emoji`}
                    onClick={() => onEmoji(emoji)}
                  >
                    <span className="emoji-preview">
                      {flagAsset(emoji) ? (
                        <img
                          src={flagAsset(emoji)}
                          alt=""
                          width={32}
                          height={32}
                          loading="lazy"
                        />
                      ) : (
                        emoji
                      )}
                    </span>
                    <span>{name}</span>
                  </button>
                ))}
        </div>
        {tab === "emoji" && visibleCount < filteredEmoji.length && (
          <button
            className="decoration-load-more"
            onClick={() =>
              setVisibleCount((n) => Math.min(n + 120, filteredEmoji.length))
            }
          >
            <Plus size={13} aria-hidden="true" /> Show more emoji
          </button>
        )}
        {!loading && !emojiError && !count && (
          <div className="decoration-empty">
            No matches. Try another word or category.
            <button
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              <RotateCcw size={12} aria-hidden="true" /> Clear filters
            </button>
          </div>
        )}
      </div>
      <p>
        {tab === "stickers"
          ? "Pick one, then drag, resize, rotate or change its colors."
          : tab === "emoji"
            ? "Move, resize and rotate. New emoji and their appearance depend on your device."
            : tab === "lines"
              ? "Torn-paper dividers, glitter and botanical branches. Adjust length, angle, colors and size."
              : "Pick a note, then use Add text to write on it. All charms have editable colors and size."}
      </p>
      {tab === "emoji" && (
        <p className="flag-attribution">
          Flag artwork by{" "}
          <a
            href="https://github.com/jdecked/twemoji"
            target="_blank"
            rel="noreferrer"
          >
            Twemoji
          </a>{" "}
          · CC BY 4.0
        </p>
      )}
      {!canAddSticker && (
        <p role="status">You can add up to 50 stickers and emoji per theme.</p>
      )}
      {!canAddLine && (
        <p role="status">You can add up to 30 lines per theme.</p>
      )}
    </div>
  );
}
