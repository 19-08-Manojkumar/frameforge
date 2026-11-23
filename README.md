# FrameForge

A complete photo collage editor built with Next.js App Router, React, TypeScript, Tailwind CSS, and HTML Canvas. Collage editing, drafts, and exports run locally in the browser. Optional Cloudflare AI adds text-to-image generation and reference-photo editing.

## Run locally

Requires Node.js 20.9 or newer (Node 22 or 24 LTS recommended) and npm.

```powershell
cd C:\Users\KL\Documents\projects\photo-collage-studio
npm ci
npm run dev
```

Open http://localhost:3000. The collage editor works without credentials or a database. Optional AI needs the server configuration below. If PowerShell blocks the npm script shim, use `npm.cmd` instead of `npm`.

### Optional Cloudflare AI Studio

Open **AI Studio** beside the preview to generate an image from a description. In the full editor, select a photo or a separately added image and click **AI edit** to edit that photo. You can also upload a reference directly inside AI Studio. Describe the change, choose proportions, and confirm sending the description and reference copy to Cloudflare. Nothing is sent until you click **Generate image** or **Create edited version**.

After generation, inspect the large result; edits have **Before / After** controls. **Apply to photo** replaces the chosen photo while keeping its frame, shape, and layer position, and centers its crop. **Add as new photo** keeps the original and uses the template layout. **Add as a layer** inserts an independent image you can move, crop, and reshape. **Download image** saves the generated image directly. Closing or cancelling leaves the collage unchanged. Applying a replacement cannot recover the old photo through design Undo; choose Add as new if you want to keep both versions.

To enable AI locally:

1. Copy `.env.example` to `.env.local` in the project folder.
2. Follow [Cloudflare's REST API setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/): dashboard → Workers AI → Use REST API → Create a Workers AI API Token. Copy your account ID and API token into `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Custom tokens need both **Workers AI: Read** and **Workers AI: Edit**, scoped to your account.
3. Restart `npm run dev`. In production, set these variables on the Next.js server and restart/redeploy. AI requires a Node.js server; a static-only export cannot serve the API route.
4. Open AI Studio and create a small test image. The connection indicator checks that configuration exists; authorization is verified by the first actual request.

Keep the token out of source control and chat. Never use `NEXT_PUBLIC_` for credentials. No browser credential form is provided. Missing or invalid credentials display a setup/error message while the collage editor remains usable. There is no simulated provider fallback.

If a request fails, AI Studio now reports a specific explanation and the numeric Cloudflare error code when provided. **3030** means Cloudflare flagged the generated output and withheld the image; it is not evidence of invalid credentials. That request is not retried automatically, and no collage photo is changed. **3036** means the account's daily compute allowance is exhausted; **3040** means temporary model capacity is unavailable. Authentication, account access, model agreements, paid-model restrictions, malformed requests, and timeouts have separate messages. Provider details are mapped to fixed text so tokens, descriptions, and raw internal errors are not exposed. Consult [Cloudflare's error reference](https://developers.cloudflare.com/workers-ai/platform/errors/) for documented platform codes.

This integration uses [FLUX.2 klein 4B](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/) through the fixed Cloudflare multipart REST endpoint for both tasks. AI outputs are limited to **1024 px per side**, with dimensions rounded to supported multiples of 16. Reference editing sends a proportional PNG copy with a maximum side of **504 px**; it sends the whole photo rather than the current frame crop. The full original is retained locally until Apply. AI may change faces or other details; always review results. Larger collage exports retain the selected canvas dimensions, but enlarging an AI image does not add native detail.

Cloudflare currently offers [10,000 free Neurons per day](https://developers.cloudflare.com/workers-ai/platform/pricing/), resetting at **00:00 UTC**. This is a shared account compute allowance, not a fixed image count. Stay on the Workers Free plan if you require the provider to stop when the free allocation is exhausted; the app does not enable billing or purchase credits.

The server also limits attempted requests to **60 per UTC day per Node process**, **10 per signed anonymous browser session**, two concurrent requests, and a 15-second session cooldown. Lower these using `AI_DAILY_REQUEST_LIMIT` and `AI_VISITOR_DAILY_LIMIT` (maximum 60). `AI_SESSION_SECRET` optionally provides a separate signing secret. Failed, timed-out, or cancelled requests still count because provider compute may already have started. The displayed count is the app's remaining request allowance, not Cloudflare's neuron balance. Calls time out after 90 seconds server-side; cancelling cannot guarantee a refund of provider compute.

These in-memory limits reset on server restart and are **not distributed or authentication**. Clearing cookies can reset a visitor's individual counter; the process-wide total still applies. For a public deployment across multiple workers/instances, add a shared durable rate-limit store and access/abuse controls before exposing your account quota. The server validates request sizes, reference signatures/dimensions, output dimensions, origin, consent, and multipart fields. It never accepts arbitrary provider URLs, tokens, or remote photo URLs from clients. Provider errors are sanitized and tokens/prompts are not logged by this implementation.

Only explicitly chosen AI descriptions and reference copies pass through `/api/ai/images` to Cloudflare. This app keeps no server-side photo history. Once added to the collage, AI results are normal photo blobs: they use the existing renderer, exports, and local IndexedDB draft recovery. An unaccepted result exists only in memory and is lost if the page is closed. Review [Cloudflare's data usage policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/) for provider handling.

### Production

```sh
npm run build
npm start
```

Development and production builds explicitly use Next.js's supported Webpack compiler. Turbopack encountered a Windows subprocess failure in the development environment; this does not change the Next.js App Router architecture.

For another port: `npm run dev -- --port 3001` or `npm start -- --port 3001`. Deploy as a standard Node-hosted Next.js app. Collage editing and exporting run on the client; optional Cloudflare AI uses the server API route.

## Using the studio

1. **Photos:** Quick Create is the default. Add 1–10 JPG, PNG, or WEBP photographs, or try samples. The layout fills automatically and moves to design selection. Manage photos to reorder, remove, or add more; choosing a thumbnail there makes it the cover photo.
2. **Design:** Browse recommended travel designs, **Beach**, **Mountains**, **Road trips**, **City & heritage**, or **All designs**. Recommendations use the photo count and first photo's proportions. All thirty-one designs use actual photo previews. Optional destination, starting point, date, and caption fields update compatible travel designs, with suggested captions for each collection.
3. **Download:** Choose Instagram Square, Instagram Portrait, Story, WhatsApp Status, or Landscape. Select PNG, JPG, or WEBP and download the real combined image. Open your social app and attach it to your post.

The large preview stays visible while controls scroll in their own pane. **Customize** or **Full editor** opens the complete editor with the same photos and edits; **Quick Create** returns without losing work. The full editor provides custom dimensions, JPG/WEBP quality, colors, fonts, stickers, layers, photo movement, resizing, rotation, shape changes, crop adjustment, replacement, removal, and extra images. `/?mode=editor` opens the full editor directly.

The full editor keeps the same three-column layout for every output size: templates/photos on the left, preview in the center, and colors/downloads on the right. Only the controls inside the preview adapt to the canvas. **Portrait and Story:** when there is enough unused side space, actions and selected-element controls dock to the right of the canvas, preserving its full fitted height while you edit. **Landscape:** those controls sit above the canvas within the center panel. Quick Create also keeps its existing side panel, and smaller screens retain their stacked panels with independent scrolling.

The portrait toolbar stacks its sticker, line, and layer menus into full-width rows. Photo, text, sticker, and line editing controls wrap within their pane, with vertical scrolling when needed, so controls remain accessible at narrow widths.

The interface uses a light teal palette, soft panel borders, color cues for editing tools, and consistent Lucide icons across navigation, categories, editing, drafts, and export. Icon menus retain native keyboard-accessible selects and visible labels. Visual styling is separate from the canvas renderer and does not alter exported artwork. Hover feedback respects reduced-motion preferences.

**Full screen** is available in both modes, including on phones. **Focus preview** hides the outer editor panels. Zoom enlarges the actual scrollable stage so every edge remains reachable; **Fit** restores the complete composition. The image keeps its selected aspect ratio, and preview layout changes do not affect downloaded pixel dimensions.

Click or tap text once to type **directly on the collage**, in Quick Create or the full editor. Text automatically wraps to the next line at the box edge while retaining your chosen font size. Enter adds an explicit line break. The box grows vertically to fit its content without an internal scrollbar. Font, color, size, backing, and alignment stay editable in the text toolbar.

Drag the **Move** handle to place the entire text area anywhere within the canvas, including while typing. Drag either side handle to change the wrapping width, or a bottom corner to change width and minimum height. **Box width** provides a precise slider; resizing the box never scales the font. Text alignment works inside the same box. Move and resize handles also support arrow keys; hold Shift for larger changes. In either mode, unedited lettering can also be dragged directly. Native text selection inside the input keeps working.

Click elsewhere, use **Done**, Escape, or Ctrl/Cmd+Enter to finish. Changing layer depth finishes typing and shows the new stacking order. Hidden text remains reachable from **Text layers → Edit** and is temporarily brought into view without changing its saved depth. Box position, width, and minimum height belong to each theme, scale with output dimensions, and survive local draft recovery. The same wrapping layout is used by the canvas, theme cards, and downloads. Template wording and trip caption fields also expand automatically.

### Travel collections and personalization

Twenty-one travel designs have destination and caption bindings. Route Diary and Departure Club also support a starting point. Dates become an editable badge and are formatted without timezone shifts. Filling one field updates only its matching text layers across compatible designs, preserving typography, position, custom text, and photo edits. Date badges can be edited or removed in the full editor. Clearing the date removes its badge. The three blended poster designs explain the portrait-first photo order; ready landscape designs are recommended when the lead photo is landscape. Long destination names wrap within their text box through the shared renderer.

Travel headings use bundled Caveat, Satisfy, Playfair Display, Cormorant Garamond, and Bebas Neue faces. Default wording is generic rather than assuming a destination. The hiking composition uses a dark green background for readable captions. Templates remain fully editable and support all output sizes and one to ten photos.

### Fonts, emoji, and stickers

Every vector sticker and Creative Charm has four selectable artwork styles, giving **640 looks across 160 designs**:

| Style             | Appearance                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| **Classic**       | Original clean vector artwork and colors; preserves existing drafts.   |
| **Anime Pop**     | Dark comic contours, offset cel shadows, and bright ink highlights.    |
| **Trend Studio**  | Layered depth, glossy color gradients, and holographic reflections.    |
| **Vintage Paper** | Warm faded inks, imperfect print edges, and deterministic paper grain. |

In **Stickers & emoji**, use **Choose a style** on the Stickers or Creative Charms tab to preview that treatment throughout the gallery, then add an item. Select an existing item and use **Artwork style** to change just that sticker or charm. Each style shows an actual artwork preview. Styling keeps its position, size, colors, opacity, rotation, and layer order; duplicates and local drafts preserve it. Note writing areas account for the artwork's styled proportions. The picker, live collage, theme thumbnails, and exports share the same vector painting function. Gallery thumbnails are cached with a bounded pixel cache. Native emoji and decorative lines retain their separate controls.

- Every selected photo, added image, text, sticker, or emoji has a single **Layer** button. Click it to cycle **Top → Bottom → Middle → Top**, placing the element among all other editable elements. With only two elements it switches between top and bottom. Text also offers arrows to move one layer at a time. The counter reads from back to front. Select hidden text from **Text layers** and click **Edit** to change its wording. The shared order belongs to each theme and appears in its preview, gallery card, and download.
- Select any text on the preview to choose from **23 font styles**. The menu includes sixteen bundled fonts: Outfit, Playfair Display, Cormorant Garamond, Libre Baskerville, Caveat, Dancing Script, Pacifico, Lobster, Bebas Neue, Anton, Oswald, Quicksand, Space Mono, Abril Fatface, Permanent Marker, and Satisfy, plus seven system font choices. Font, color, size, bold, italic, alignment, and text backing controls appear when text is selected. Font files are served by this app; the editor waits for the selected face before drawing and downloading.
- Open **Stickers & emoji** above the preview for **100 stickers**, **60 Creative Charms**, **40 decorative line designs**, and the full **3,963-entry Unicode Emoji 18.0 catalog**, including gender and skin-tone variants. The four collections are Stickers, Emoji, Lines, and Creative Charms. Each collection has independent search and category/collection filters. Filters and tabs remain visible while the results scroll inside the picker. Emoji are loaded locally on demand and appear in batches as you scroll, so the editor stays responsive.
- **Lines** features distinct artwork: multicolor glitter and facets, neon glow, aurora ribbons, shooting comets, pearls, crystals, sequins, eucalyptus, olive, fern, ivy, palm fronds, blossoms, wheat, ocean waves, butterflies, and celestial garlands. Larger gallery cards show the actual Canvas rendering. Move a design and edit its primary/accent colors, size, curve, and opacity. A Classic stroke option retains the original solid, dashed, dotted, double, wavy, zigzag, dash-dot, and arrow styles. Shared deterministic drawing keeps glitter patterns and botanical details consistent across the gallery, live preview, saved drafts, and high-resolution exports.
- **Creative Charms** has sixty drawings, including the original thirty and thirty additional designs. Filter by **Notes & journals**, **Travel & collage**, **Playful accents**, or **Original collection**. New post accents include a digital camera, photobooth strip, boarding pass, luggage tag, coastal stamp, camping patch, heart itinerary, message bottle, sunset window, checker ribbon, matcha cup, chrome heart balloon, rosette, citrus, tulips, orbit star, coffee duo, dice, ballet ribbons, and bubble star. Each uses editable primary/accent colors, size, rotation, opacity, flipping, outline, and layer controls.
- The **ten Notes & journals charms** are a folded sticky note, top-spring notebook, side-spiral journal, washi-taped memo, grid planner, torn kraft journal, pinned blush note, folded letter, scalloped caption card, and ring-binder spread. Add one at its larger writing size, keep it selected, and click **Add text**. A separate text layer appears in the clear writing area with a readable color and handwriting font. It retains all normal text controls, wrapping, movement, and depth. The note and text remain independent editable layers. Narrow notebook captions support text boxes down to 2% of the canvas width.
- **Lines → Torn paper** contains ten filled paper separators: soft deckle, jagged white rip, kraft, layered seam, newsprint, graph paper, spiral-page tear, translucent washi, scalloped lace, and burnt parchment. These have different edge geometry, fibers, layers, or printed details. Drag a divider between photos; use **Length**, **Angle**, **Size**, **Curve**, colors, and opacity to fit it horizontally, vertically, or diagonally. The same vector renderer draws thumbnails, preview, and full-resolution downloads. All forty lines can be filtered into Torn paper, Botanical, and Sparkle & ornaments.
- **Undo** and **Redo** buttons in the header, or Ctrl/Cmd+Z and Ctrl/Cmd+Y, step through recent design edits. History is kept for the current editing session.
- Sticker categories include **Trip routes**, **Travel & places**, **Nature**, **Food & drink**, **Celebration**, **Frames & labels**, and **Music & film**. The latest fifty designs include exactly **25 dotted trip-route compositions**: point-to-point paths, mountain switchbacks, summit and coastal routes, island hops, flight paths, map itineraries, campsite routes, and start/destination markers. They use the same editable primary/accent colors, size, rotation, and opacity controls. Use **Add text** for your own destination names or captions.
- The other 25 new stickers include Polaroid and film frames, washi tape, torn notes, postal stamps, journal labels, retro blooms, checkered hearts, ribbons, vinyl, cassette, boba, and more. All stickers are vectors that remain sharp in high-resolution exports.
- Emoji categories include **Popular**, **Smileys & Emotion**, **People & Body**, **Animals & Nature**, **Food & Drink**, **Travel & Places**, **Activities**, **Objects**, **Symbols**, and **Flags**. Search by name, category, or pasted emoji; for example, “flag India”, “coffee”, or “butterfly”. Search and category filters combine. An empty result offers **Clear filters**.
- Click or tap a choice to add it. Drag to move; use the corner handle or **Size** slider to resize. Edit primary and accent colors, toggle the white outline, change opacity, rotate in 15° steps, flip, duplicate, delete, or reorder stickers. Arrow keys nudge the selected sticker; Shift moves farther. The **Layers** menu also selects covered or fully transparent stickers.
- Emoji support movement, size, rotation, flipping, duplication, opacity, and removal. **All 270 flag choices use bundled SVG artwork**, so country flags and regional flags display as pictures on Windows as well as other devices. The picker, canvas, theme card, and download use the same local flag files; export waits for the selected artwork to decode. Other emoji use the device's native artwork; the newest symbols and complex combinations depend on installed emoji fonts. Emoji retain their original colors; choose a sticker for editable colors.
- Decorations belong to the selected theme, survive switching themes, and appear in its thumbnail, live preview, and download. Up to 50 stickers and emoji can be added per theme. **Start over** clears them; refresh protection includes these edits. The picker and controls scroll within the workspace on small screens.

Bundled font files are unmodified Latin webfont subsets from [Google Fonts](https://github.com/google/fonts). Copyright and license notices are included in `public/fonts/licenses/`, with individual source links in `public/fonts/README.md`. Fourteen families use SIL OFL 1.1; Permanent Marker and Satisfy use Apache 2.0. No external font requests are made while editing.

The full emoji data uses the fully qualified sequences and official group/subgroup names in [Unicode's emoji-test.txt](https://www.unicode.org/Public/emoji/latest/emoji-test.txt), bundled at version 18.0. Source details and the Unicode license are in `public/emoji/`. The app makes no runtime request to Unicode or an emoji service.

Flag artwork is from [Twemoji v17.0.3](https://github.com/jdecked/twemoji/tree/v17.0.3), by Twitter, Inc. and other contributors, under CC BY 4.0. Its license and attribution are in `public/emoji/flags/` and the emoji picker. Flags load from the local app; no external emoji service is needed.

### Adding separate images

Use **Add image** above the preview to place an extra JPG, PNG, or WEBP independently. **Photos** continues to populate the selected template. Added images have their own **Added images** selector and never enter the template photo collection or change its arrangement, count, or cropping. Up to ten separate images can be added per theme, in addition to its ten template photographs, subject to the shared browser memory limit.

Drag an added image, resize its handles, change its shape, rotate, use **Adjust photo** to pan/zoom inside its frame, or cycle its **Layer** button. Replace preserves its frame; Remove deletes only that image. Added images retain their natural proportions on insertion, support transparent PNGs, and can be used without template photo uploads. They survive theme switching within the tab and are included in thumbnails and downloads. **Start over** clears them and refresh protection covers them. **Reset layout** applies only to the template photos.

The preview occupies the full center column from below the compact header to the bottom of the window. On desktop, switch between **Templates** and **Photos** in the left sidebar; uploads and photo ordering never take height away from the preview. Export settings scroll independently on the right. **Focus preview** hides both sidebars for more canvas width, and **Show panels** restores them without losing your work. The image automatically fits the available space while preserving its aspect ratio. On phones and smaller tablets, **Templates → Photos → Export** changes a compact lower tool pane beneath the larger preview. The page itself does not scroll.

Uploading your own photographs replaces the sample collection. Valid images in mixed batches are accepted, with an explanation for any rejected files. Original files stay on your device; the editable project can be recovered from the browser draft after a reload.

### Refreshing and starting over

The current project autosaves to **IndexedDB on this browser and device**, after an 800 ms pause in changes. The save status shows waiting, saving, saved, or an error, with **Save now** and **Retry** when relevant. Draft data stays on this device. Optional AI sends only the description and chosen resized reference for that request. There are no user accounts or cloud draft storage.

- Original photo bytes are stored as Blobs without recompression. Photo order, crop/zoom, per-theme frames and depth, text/fonts, colors, stickers/emoji, independent images, trip details, output settings, mode, and current step are preserved. Unchanged image files are not rewritten for every text change.
- A reload or return visit offers **Continue editing** with a preview and save date, or **Start a new collage instead**. Original images are decoded only after Continue is chosen. Starting new deletes the saved project and its image data.
- Image data and edit metadata commit in one transaction. If storage is unavailable, full, or fails, the last successful draft remains intact, editing/download still work, and recent changes receive a refresh/leave warning. Missing draft photos produce a retry/discard message rather than silently dropping content.
- Only changes not yet saved are protected by refresh/close warnings. F5 or Ctrl/Cmd+R opens **Keep editing**, **Download first**, or **Refresh anyway**. A saved project can reload normally and be recovered. Native browser prompts control their own wording and availability.
- A revision check prevents another tab from silently overwriting a newer saved draft. The older tab keeps its current edits and can download them or reload the saved project.
- **Start over**, or the logo with work in progress, asks before clearing the draft and full editor state. Removing all photos also removes obsolete saved image data when no other edits remain.
- Browser storage can be cleared by the user, evicted by the browser, or be unavailable in restricted/private sessions. Drafts are local to the current origin/profile and do not sync between devices. Download finished work for a separate copy.

### Editing a ready-made theme

- Select a photo by clicking/tapping its visible area, its thumbnail, or the **Selected photo** menu. **Move frame** drags the entire frame. **Adjust photo** locks the frame and lets you drag the image inside it; double-clicking a photo also opens this mode.
- In **Adjust photo**, use **Left / right** and **Top / bottom** sliders or the five alignment buttons to reveal the edges or center of your photograph. **Zoom** ranges from 100% to 300% and crops proportionally, without empty edges. At 100%, an image that already fits an axis has no spare area to move on that axis; zoom in to create room. **Reset** in this mode centers the crop and returns zoom to 100% while preserving the frame.
- Drag any of the eight frame handles to resize. Hold Shift to keep its ratio. Width and height controls also support precise sizing; images are proportionally cropped rather than stretched.
- Choose Original shape, Rectangle, Rounded, Circle, Diamond, or Arch. Rotate in 15° steps, or click **Layer** to cycle between the top, bottom, and middle of the shared element stack.
- **Replace** keeps the frame and resets that photo's crop. **Remove** deletes the photo. Once a layout is customized, removing or adding a photo preserves the other frames. New photos receive their own movable frames.
- Photo layout changes belong to the selected theme and survive switching themes. They scale with the chosen output dimensions. **Reset** restores the selected photo; **Reset layout** restores the theme's arrangement without removing wording or colors.
- With the preview focused, arrow keys move the selected frame (Shift moves farther); Delete/Backspace removes it and Escape deselects it. Resize handles also respond to arrow keys. Adjust photo mode uses arrows to pan the image while the frame stays fixed.

The selection outline, handles, and editing controls are never included in the exported image. Text starts above photos; layer controls can place it behind or between images and decorations. All element types use this same shared stack.

**Theme colors** is always available in the settings panel. Choose a swatch or enter a hex color for the background and photo gaps. Tour designs also provide a separate title or caption area color. In Scenic Fan, **Below photos** changes the lower title panel, **Photo gaps** changes the fan separators, and **Background** changes the outer border. Colors are remembered separately for each theme and used by its gallery card, live preview, and download. **Reset** restores that theme's original colors without removing your wording or crop changes. Choosing a solid background replaces Modern Gradient's gradient or Torn Travel Diary's photographic backdrop; Reset restores the original finish.

### Themes

The **Tour** category contains **twelve** designs, including five blended compositions: **Sunset Drift** uses a warm panoramic dissolve and subtle golden light leak; **Cloudline Escape** floats oval photo fades above a landscape; **Prism Voyage** interweaves diagonal photo ribbons; **Midnight Mirage** combines a dark scenic base, a luminous Screen double exposure, and organic photo fades; **Tidal Reverie** uses flowing wave-shaped transitions on a coastal poster. These compositions draw on cinematic storytelling and sensory surfaces in [Canva's 2026 design directions](https://www.canva.com/newsroom/news/design-trends-2026/). Each uses different photo geometry, text placement, tonal washes, and edge treatment. All support 1–10 photos, every output size, editable wording, independent colors, and Quick Create destination/caption fields.

Select a photo and open **Opacity & soft edges → Edge blend** to choose **Soft edges**, **Cloud fade**, **Diagonal dissolve**, **Wave dissolve**, or **Organic dissolve**. **Blend softness** controls the custom fade; the separate **Soft edge** slider controls the outer frame fade. **Normal**, **Multiply**, **Screen**, and **Soft light** remain available for color compositing. Crop alignment/zoom changes the source image inside the same frame; movement, resizing, shape, opacity, and layer controls still work. Reset restores the theme's original treatment. Original photo detail stays sharp in the clear center; the masks alter alpha rather than blur the image. The shared smoothstep masks are cached with a bounded cache and used identically by cards, preview, drafts, and downloads. Midnight Mirage works best with darker scenery first and a portrait or landmark second; it does not extract people or remove backgrounds.

The **Trip** category contains **nine** editable compositions. Five original additions bring different structures: **Departure Club** has a photo boarding pass and perforated itinerary stub; **Alpine Atlas** pairs an arch with circular detail crops on topographic contours; **Off Grid Zine** uses oversized blue typography, angular photo cutouts, and an orange torn ribbon; **Horizon Cinema** uses a large opening panorama, a dedicated title band, and a memory reel; **Browser Getaway** arranges photos in retro desktop windows on a pastel dot grid. They support one to ten photos, all output sizes, separate background/gap/panel colors, direct text editing, photo adjustment, and local draft recovery. Quick Create personalizes every new design; Departure Club also binds the starting point. Every visible word is an editable text layer, including window labels and ticket details.

The new compositions draw on tactile surfaces, clean editorial typography, cut-and-paste zines, cinematic storytelling, and retro computing directions described in [Canva's 2026 design trends](https://www.canva.com/newsroom/news/design-trends-2026/). All artwork is deterministic Canvas geometry; no external imagery, template service, or image generation is required.

The four earlier Trip compositions remain available. Route Diary uses textured map paper, tilted prints, notebook perforations, tape, a central ruled note, and editable origin-to-destination wording. Coastal Exposure uses an airy portrait above a wide panorama; Golden Road Trip uses a framed continuous photo poster; Heritage Reverie layers a full-bleed portrait, landmark, and foreground. Directional crossfades merge their large photos. For the three blended posters, start with a portrait and follow with scenery; transparent PNG portraits give the isolated silhouette look in the references. These templates do not automatically remove backgrounds or extract people. Every crop, including zoom, is shared by preview and export.

Every photo can be selected from the canvas, thumbnail, or photo menu, including layers behind other photos. Under **Opacity & soft edges**, adjust opacity, edge softness, and Normal/Multiply/Screen/Soft light blending. All printed wording is represented by editable text layers; none is baked into a reference image. Reference photos are not bundled as collage backgrounds. The same renderer draws thumbnails, the workspace, and downloads.

| Theme             | Composition                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Sunset Drift      | A warm panoramic dissolve, blended supporting scenes, and a golden light leak            |
| Cloudline Escape  | Soft oval photo islands above a landscape and an airy editorial title                    |
| Prism Voyage      | Overlapping diagonal photo ribbons with smooth directional dissolves                     |
| Midnight Mirage   | A dark scenic base, Screen double exposure, and organic memories                         |
| Tidal Reverie     | Flowing wave-shaped photo dissolves with a gentle coastal paper wash                     |
| Departure Club    | A photo boarding pass, separate itinerary stub, perforations, and barcode artwork        |
| Alpine Atlas      | A large arched photo, round detail crops, and organic topographic contour lines          |
| Off Grid Zine     | Oversized editorial type, angular cut-paper photos, and a torn caption ribbon            |
| Horizon Cinema    | A panoramic opening scene, serif title band, and supporting memory reel                  |
| Browser Getaway   | Retro desktop photo windows, pastel dot grid, and editable camera-roll labels            |
| Route Diary       | A map-paper diary with tilted photo prints, route marks, and an editable central note    |
| Coastal Exposure  | An airy portrait and coastal panorama with soft photo edges and destination typography   |
| Golden Road Trip  | A warm paper poster with continuous blended scenery and handwritten titles               |
| Heritage Reverie  | Golden portrait, landmark, and reflection layers with an elegant serif title             |
| Scenic Fan        | Reference-inspired radial photo wedges converging into a road poster                     |
| Torn Travel Diary | Reference-inspired pinned prints, a torn photo strip, and a soft photographic background |
| Clean Grid        | Balanced adaptive rows with narrow gutters                                               |
| Magazine          | Large lead photograph and an asymmetric supporting mosaic                                |
| Polaroid          | Angled instant-photo frames, layered paper, and shadows                                  |
| Film Strip        | Cinematic rows and perforated film edges                                                 |
| Scrapbook         | Varied photo sizes, tilted paper frames, and tape                                        |
| Minimal White     | Generous negative space and alternating photo scale                                      |
| Dark Editorial    | Dominant lead photo with smaller supporting images                                       |
| Travel Journal    | A two-part travel spread with paper framing and stitched borders                         |
| Retro Vintage     | Uneven rows, warm paper, slight rotation, and subtle color tint                          |
| Modern Gradient   | Rounded photo panels on a soft multicolor gradient                                       |
| Tour Poster       | Reserved cover typography, a large lead photo, and a supporting photo strip              |
| Sea Breeze        | Coastal moodboard with a circular focal image and palette swatches                       |
| Let’s Hike        | A panoramic hero, a dedicated title band, and small trail memories                       |
| Wander Cutout     | Angular photo cutouts with a clear typographic band                                      |
| Postcard Stack    | Tilted keepsake prints with a postal border and stamp                                    |

Layouts adapt to the image count and output aspect ratio, without empty image slots. Photos are proportionally cropped and can be repositioned in the live preview. A shared soft photo mosaic and feathered frame edges blend the images into each theme.

Tour blend checks also verify all four continuous alpha masks, clear center pixels, independent template defaults, serialized blend metadata, five distinct actual-photo previews, adjustable blend styles and softness, fixed-frame crop changes, PNG preview/export parity for every new Tour design, all social preset dimensions, PNG/JPG/WEBP output, draft recovery, and phone controls.

### Output sizes

| Preset             | Pixels                                          |
| ------------------ | ----------------------------------------------- |
| Instagram Square   | 1080 × 1080                                     |
| Instagram Portrait | 1080 × 1350                                     |
| Instagram Story    | 1080 × 1920                                     |
| WhatsApp Status    | 1080 × 1920                                     |
| Landscape          | 1920 × 1080                                     |
| Custom             | 320–6000 pixels per side, at most 24 megapixels |

Custom aspect ratios range from 1:4 to 4:1. Files are limited to 30 MB and 60 megapixels each, with a 160-megapixel collection limit. These guardrails reduce browser memory failures. Very large exports can still exceed memory on older phones; choose a smaller output size if the browser reports an allocation failure. Small originals cannot gain real detail when enlarged.

## Architecture

```text
app/
  page.tsx                  Server entry point; chooses Quick Create or full editor
  layout.tsx                Metadata and app shell
  globals.css               Tailwind entry point and responsive styles
  workspace.css             Viewport workspace and independent pane scrolling
  photo-editor.css          Photo selection, resize handles, and editing controls
  session.css               Refresh warning and start-over dialog styles
  quick-create.css          Simple three-step workspace and travel collection controls
  drafts.css                Save status and centered recovery dialog
  error.tsx                 Recoverable route error UI
components/
  Studio.tsx                Shared editor state, mode switching, and draft integration
  ImageUploader.tsx         Drop zone and file input
  ImageGallery.tsx          Photo ordering, removal, and addition
  ThemeSelector.tsx         Theme gallery and category filtering
  ThemeCard.tsx             Memoized Canvas thumbnail
  CollagePreview.tsx        Live Canvas preview, zoom, expanded view
  ToolbarSelect.tsx         Labeled native tool menus with consistent decorative icons
  QuickCreatePanel.tsx      Upload, photo-count recommendations, personalization, download
  TravelDetailsForm.tsx     Destination, origin, date, and caption suggestions
  useLocalDraft.ts          Debounced saving, recovery, errors, and tab revision protection
  DraftRecoveryDialog.tsx   Continue editing or discard a locally saved draft
  DraftStatus.tsx           Visible saving/saved/error status and retry
  ExportPanel.tsx           Dimensions, format, quality, download
  ThemeColors.tsx           Background, gap, and title-panel color controls
  PhotoControls.tsx         Shape, dimensions, crop/move, rotation, and layer actions
  PhotoAdjustments.tsx      Fixed-frame photo zoom, positioning sliders, and edge alignment
  StickerLibrary.tsx        Search, separate categories, and paged local emoji loading
  StickerPreview.tsx        Cached Canvas previews using the shared vector artwork painter
  StickerStylePicker.tsx    Four live style choices for the gallery and selected item
  LinePreview.tsx           Real Canvas effect thumbnails for the line gallery
  LineOverlay.tsx           Line selection, dragging, colors, size, curve, and opacity
  StickerControls.tsx       Sticker colors, size, opacity, rotation, and layer actions
  StickerOverlays.tsx       Mouse, touch, and keyboard sticker manipulation
  usePhotoEditing.ts        Pointer and touch gestures for photo layers
  useSessionGuard.ts        Browser leave warning and refresh shortcuts
  SessionExitDialog.tsx     Accessible refresh/restart confirmation and download-first flow
lib/
  themeLayouts.ts           Pure deterministic layout definitions
  travelLayouts.ts          Twelve adaptive Tour template compositions
  blendedTourLayouts.ts     Five adaptive blended Tour compositions
  blendedTourThemes.ts      Editable Tour wording, colors, and blend labels
  blendedTourDecorations.ts Cinematic tonal washes and travel details
  photoBlending.ts          Smooth cached alpha masks with clear focal centers
  tripLayouts.ts            Nine adaptive Trip layouts with independent photo layers
  tripDecorations.ts        Map contours, paper details, and exposure title tints
  newTripLayouts.ts         Five distinct photo geometries with adaptive filled rows
  newTripThemes.ts          New Trip names, panel colors, and editable lettering
  newTripDecorations.ts     Tickets, contour maps, cut-paper ribbons, cinema, and windows
  themeCustomization.ts     Editable template wording and theme defaults
  textLayout.ts             Shared word wrapping and text-box geometry for Canvas and editing
  layerOrder.ts             Shared photo/text/sticker depth, presets, and single-step moves
  travelTemplates.ts        Travel collections, recommendations, and editable text bindings
  draftStorage.ts           Atomic IndexedDB storage of original Blobs and edit metadata
  fonts.ts                  Font choices and font readiness for preview/export
  stickers.ts               Shared vector paths, emoji catalog, and sticker bounds
  stickerStyles.ts          Four named style definitions, inks, and artwork proportions
  stickerArtwork.ts         Shared Classic, Anime Pop, Trend Studio, and Vintage Paper painter
  extraStickers.ts          Additional editable travel, nature, food, and celebration art
  postStickers.ts           Fifty more post designs, including 25 dotted Trip routes
  creativeCharms.ts         Sixty editable vector charms, including the original collection
  newCreativeCharms.ts      Thirty additional designs, including ten writing surfaces
  noteText.ts               Readable text insertion into a selected note's writing area
  previewLayout.ts          Aspect-aware side docking, full-image fitting, and zoom sizing
  uiIcons.ts                Shared theme, travel-collection, and output-size icons
  lineCatalog.ts            Forty decorative line presets and collection filtering
  lineGeometry.ts           Bounded line length and angle transformations
  tornPaperLines.ts         Ten filled paper dividers with deterministic edge textures
  decorativeLines.ts        Deterministic glitter, glow, botanical, and garland artwork
  lineRenderer.ts           Shared Canvas effect and classic-stroke rendering
  decorationCatalog.ts      Shared category and search filtering with lazy emoji loading
  emojiCatalog.json         Full local Unicode Emoji 18.0 catalog
  emojiMetadata.ts          Version, count, and emoji category metadata
  stickerRenderer.ts        Canvas vector and native emoji rendering
  flagEmoji.ts              Lazy local flag SVG decoding shared by preview/export
  extraImages.ts            Independent image defaults and insertion bounds
  photoEditing.ts           Normalized photo layers, shape masks, bounds, and hit testing
  collageRenderer.ts       Shared Canvas drawing and crop engine
  imageLoader.ts           Signature validation, decode, preview cache
  imageExport.ts           Original-resolution rendering and encoding
  settings.ts              Presets and resource limits
types/collage.ts            Shared TypeScript contracts
types/ai.ts                 AI task, source, status, and apply contracts
components/AiStudio.tsx      Optional generation/edit dialog and result review
app/api/ai/images/route.ts   Server-only Cloudflare proxy and status endpoint
lib/ai/                     Multipart adapter, request limits, reference resizing
.env.example                Empty server configuration template; no credentials
public/samples/             Bundled sample photos and source credits
tests/layouts.test.ts       Geometry, cropping, dimension validation
tests/browser/             End-to-end upload and download verification
```

`createLayout` computes positions in the requested output dimensions. `renderCollage` uses those same positions for gallery thumbnails, the main preview, and export. It scales the Canvas backing resolution for previews; it draws from full-resolution originals for downloads. Original decoded images and reduced preview copies remain in browser memory. Image decoding is sequential, preview rendering is scheduled with `requestAnimationFrame`, and gallery cards are memoized. Object URLs and canvas buffers are released when removed or no longer needed.

Photo formats are checked using file signatures rather than extensions alone. Canvas errors and unsupported output codecs produce a visible message. If a browser silently substitutes PNG for a requested format, the app rejects the result instead of saving a misleading extension.

Ordinary photo imports and collage exports use browser object URLs and Canvas without uploading photos. Sample photos and bundled fonts are served from this project's own public directory. There are no analytics, externally served fonts, authentication, cloud draft storage, or subscriptions. The optional `/api/ai/images` route sends only explicitly confirmed AI requests to Cloudflare; server credentials are never bundled into the browser.

## Verification

Automated AI checks use mocked Cloudflare responses and real browser-decoded PNG fixtures, without spending account quota. They cover multipart payloads, reference resizing, consent, signed sessions, request limits, sanitized provider failures, cancellation, replacement versus independent layers, exact-size exports, draft recovery, and responsive dialogs. A live diagnostic on October 30, 2026 successfully generated a 512 px neutral illustration and reproduced Cloudflare's HTTP 400 / code 3030 output-safety block for a 1024 px anime action request. Provider output and moderation decisions can vary between requests. Live credentials and diagnostic files are excluded from the source archive.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite starts the production server on port 3100. To use an installed Microsoft Edge on Windows instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

Unit coverage includes all thirty-one themes × ten photo counts × seven output shapes (2,170 layout cases), frame bounds, image ordering, non-overlap for standard layouts, intentional soft exposure layers, crop ratios, zoomed crop bounds, size validation, frozen layouts, rotated bounds, shape hit testing, and layer order. Browser tests verify five-photo exports across all themes, preset dimensions, PNG/JPG/WEBP signatures, custom sizes, mobile ordering, sample replacement, invalid files, drag-and-drop, image limits, local processing, independent area colors, direct text editing, photo movement/resizing/shapes/replacement/removal on desktop and touch, and preview/export pixel consistency. Adjustment tests verify edge alignment, zoom, mouse and touch panning with unchanged frame geometry, and editing a portrait beneath overlapping scenery. Trip tests edit every wording field and photo layer across all nine designs, exercise opacity and blending, compare edited exports, and check the phone gallery. New Trip checks cover personalization bindings, independent default copies, and photo selection. Every new design exports at all five social presets; a comparison sheet uses the same five real photos, and a draft check recovers edited wording and crop pixels.

Preview workspace checks also verify that the left, center, and right panels keep identical bounds when switching output orientation, portrait tools use unused side space, landscape tools stay above the center canvas, zoomed edges remain reachable, and Quick Create supports an expanded preview on phones. Toolbar checks add stickers, lines, independent photos, and text together on four desktop and phone sizes, then verify that every control stays within the center pane without horizontal overflow. Sticker-style checks render all 640 artwork combinations, compare Classic with the original painter using subpixel edge-rounding tolerances, verify four different looks for every design, compare all four styled sticker/note exports with the preview, recover independent styles from drafts, and check the chooser on 320 px and 390 px phones.

Browser tests target Chromium/Edge. Firefox, Safari, and physical-device memory limits should be checked in the intended deployment environment. The UI uses modern Canvas APIs supported by current browsers.

Session tests cover refresh shortcuts, a real native beforeunload prompt and cancellation, confirmed refresh without a duplicate prompt, full editor reset, download-first behavior, edits made before upload, and a mobile confirmation dialog. Responsive checks ensure the new controls keep the page within the viewport.

Quick Create tests cover a five-photo personalized WhatsApp export, unchanged work across modes, all 31 designs, and 320/390/768 px phone/tablet layouts. Draft tests compare original file hashes, restore the exact rendered pixels with text, masks, colors, stickers, and added images, verify output dimensions after recovery, and cover discard, cleared photos, missing assets, unavailable storage, conflicting tabs, and phone recovery. Legacy editor tests open `/?mode=editor`; unsaved-session tests deliberately disable storage to exercise fallback warnings. Set `STUDIO_TEST_PORT` to use an isolated test port (default 3100).

Decoration tests check all sixteen bundled font faces, all 160 vector sticker drawings, forty distinct live line previews and Canvas effects, glitter/glow/botanical export parity, editable line colors, the Creative Charms search, fifty popular emoji, full Unicode catalog completeness, separate category/search filters, incremental emoji loading, editable dotted-route colors and export parity, native touch movement, scrolling to the final sticker on a phone, per-theme persistence, and reset behavior. Note/divider checks cover Add text on all ten writing surfaces, caption bounds and contrast, ten distinct paper tears, length and angle changes, exact draft restoration, matching PNG output, and 320/390 px phone layouts. Font selection is also checked for external network requests.

Layer tests verify text below photos, between elements, and above stickers; forward/backward boundaries; hidden-text selection and editing; matching PNG output; per-theme depth; and touch controls without page scrolling. The canvas renderer and transparent editing hit targets share the same ordered element list.

Independent-image checks cover unchanged five-photo theme geometry, separate selection, insertion without template uploads, shape/crop/depth edits, replacement/removal, theme persistence, reset, and exact-size PNG parity. Flag checks decode all 270 bundled SVGs, verify actual tricolor pixels on canvas, and compare download output. Shared layer buttons are exercised for text, photos, images, stickers, and emoji.

## Sample photography

Bundled demonstration photos are from [Lorem Picsum](https://picsum.photos/), sourced from Unsplash. The original authors, source URLs, and IDs are retained in `public/samples/credits.json`: Philippe Wuyts, NASA, Alexey Topolyanskiy, Rachel Davis, and Andrew Coelho. These photos are used only when the visitor chooses **Try sample photos**.

## Formatting

`npm run format` formats the source using Prettier. Use `npm ci` for reproducible installation from the included lockfile. No secrets or private photos are included in the source.
