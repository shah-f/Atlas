"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatUiCopy, getReviewIqUiCopy } from "@/lib/reviewiq/ui-copy";

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function hashString(input: string) {
  return Array.from(input).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

type StampVisual = {
  gradient: string;
  tile: string;
  hasPhoto: boolean;
  photoAlt: string | null;
};

export type StampediaStamp = {
  stayId: string;
  propertyId: string;
  tripId: string;
  displayName: string;
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  room: string;
  confirmation: string;
  dateLabel: string;
  durationLabel: string;
  visual: StampVisual;
  reviewTitle: string | null;
  reviewText: string;
  submittedAt: string | null;
  collected: boolean;
  selected: boolean;
};

export type StampediaTrip = {
  id: string;
  tripId: string;
  title: string;
  country: string;
  subtitle?: string;
  dateRange: string;
  durationLabel: string;
  collectedCount: number;
  stampCount: number;
  stamps: StampediaStamp[];
  uploadedPhoto?: {
    src: string;
    alt: string;
    caption: string;
  } | null;
};

type StampediaJournalProps = {
  customerName: string;
  languageCode: string;
  trips: StampediaTrip[];
  activeTripId: string;
  turning: boolean;
  stampAnimationActive: boolean;
  newStampStayId: string | null;
  onTripSelect: (tripId: string) => void;
  onTripRename: (tripId: string, title: string) => void;
};

type StampCardProps = {
  stamp: StampediaStamp;
  index: number;
  fresh: boolean;
  flying?: boolean;
  openReviewLabel?: (stamp: StampediaStamp) => string;
  onOpenReview?: (stamp: StampediaStamp) => void;
};

type Sparkle = {
  left: string;
  top: string;
  delay: string;
};

type Twinkle = {
  left: string;
  top: string;
  delay: string;
  size: string;
};

function StampOutline() {
  return (
    <svg aria-hidden="true" className="stamp-card-outline" viewBox="0 0 360 250">
      <path
        className="stamp-card-outline-fill"
        d="M42 26
          Q 28 40 40 56
          Q 52 72 40 88
          Q 28 104 40 120
          Q 52 136 40 152
          Q 28 168 40 184
          Q 52 200 42 224
          Q 58 212 86 220
          Q 114 228 142 220
          Q 170 212 198 220
          Q 226 228 254 220
          Q 282 212 310 220
          Q 338 228 320 208
          Q 332 190 320 172
          Q 308 154 320 136
          Q 332 118 320 100
          Q 308 82 320 64
          Q 332 46 316 28
          Q 296 18 268 26
          Q 240 34 212 26
          Q 184 18 156 26
          Q 128 34 100 26
          Q 72 18 42 26 Z"
      />
      <rect
        className="stamp-card-outline-frame"
        height="166"
        rx="24"
        ry="24"
        width="262"
        x="49"
        y="42"
      />
    </svg>
  );
}

function StampCard({ stamp, index, fresh, flying = false, openReviewLabel, onOpenReview }: StampCardProps) {
  const rotation = `${index % 2 === 0 ? -2.4 : 2.1}deg`;
  const style = { "--stamp-rotate": rotation, "--stamp-index": index } as CSSProperties;
  const locationLabel = [stamp.city, stamp.country].filter(Boolean).join(", ");
  const countryCode = (stamp.country || stamp.city || "Travel").slice(0, 3).toUpperCase();
  const canOpenReview = !flying && Boolean(stamp.reviewText.trim()) && Boolean(onOpenReview);

  return (
    <article
      className={cx(
        "stamp-card",
        stamp.collected && "collected",
        stamp.selected && "selected",
        fresh && "fresh",
        flying && "flying",
        canOpenReview && "clickable"
      )}
      style={style}
    >
      {/* stamp body — just the photo inside the perforated border */}
      <button
        aria-label={canOpenReview ? openReviewLabel?.(stamp) : undefined}
        className="stamp-card-shell-btn"
        disabled={!canOpenReview}
        onClick={() => {
          if (canOpenReview) {
            onOpenReview?.(stamp);
          }
        }}
        type="button"
      >
        <div className="stamp-card-shell">
          <StampOutline />
          <div
            aria-label={stamp.visual.photoAlt ?? `${stamp.displayName} stamp`}
            className="stamp-card-photo-window"
            role="img"
            style={{ background: stamp.visual.tile }}
          >
            {!stamp.visual.hasPhoto ? (
              <div className="stamp-card-monogram">
                {stamp.displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("")}
              </div>
            ) : null}
          </div>

          {/* postmark circle — stays on the stamp */}
          <div className="stamp-card-inkring">
            <span>{countryCode}</span>
            <span>{stamp.dateLabel}</span>
          </div>

          {fresh ? <span className="stamp-card-new">★ New!</span> : null}
        </div>
      </button>

      {/* caption below the stamp */}
      <div className="stamp-card-caption">
        <div className="stamp-card-name">{stamp.displayName}</div>
        <div className="stamp-card-loc">{locationLabel}</div>
        <div className="stamp-card-room">{stamp.room}</div>
      </div>
    </article>
  );
}

function buildStampediaSparkles(seed: string): Sparkle[] {
  const base = hashString(seed);

  return Array.from({ length: 3 }, (_, index) => ({
    left: `${14 + ((base + index * 17) % 74)}%`,
    top: `${10 + ((base + index * 23) % 28)}%`,
    delay: `${index * 0.7}s`
  }));
}

function buildStampediaTwinkles(seed: string): Twinkle[] {
  const base = hashString(`${seed}:twinkle`);

  return Array.from({ length: 4 }, (_, index) => ({
    left: `${8 + ((base + index * 19) % 80)}%`,
    top: `${12 + ((base + index * 29) % 72)}%`,
    delay: `${0.8 + index * 1.6}s`,
    size: `${10 + ((base + index * 7) % 6)}px`
  }));
}

export function StampediaJournal({
  customerName,
  languageCode,
  trips,
  activeTripId,
  turning,
  stampAnimationActive,
  newStampStayId,
  onTripSelect,
  onTripRename
}: StampediaJournalProps) {
  const bookRef = useRef<HTMLDivElement | null>(null);
  const flyoverRef = useRef<HTMLDivElement | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [flyoverStyle, setFlyoverStyle] = useState<CSSProperties>({});
  const [openReviewStamp, setOpenReviewStamp] = useState<StampediaStamp | null>(null);
  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? trips[0];
  const uiCopy = getReviewIqUiCopy(languageCode);

  if (!activeTrip) {
    return null;
  }

  const activeTripIndex = Math.max(0, trips.findIndex((trip) => trip.id === activeTrip.id));
  const newestStamp = activeTrip.stamps.find((stamp) => stamp.stayId === newStampStayId) ?? null;
  const visibleStamps =
    stampAnimationActive && newStampStayId
      ? activeTrip.stamps.filter((stamp) => stamp.stayId !== newStampStayId)
      : activeTrip.stamps;
  const journalNote = !activeTrip.stamps.length
    ? formatUiCopy(uiCopy.noStampsYetNote, { title: activeTrip.title })
    : newestStamp
      ? formatUiCopy(uiCopy.newStampNote, { property: newestStamp.displayName, title: activeTrip.title })
      : formatUiCopy(uiCopy.stampsCollectedNote, { count: activeTrip.collectedCount, country: activeTrip.country });
  const sparkles = buildStampediaSparkles(activeTrip.id);
  const twinkles = buildStampediaTwinkles(activeTrip.id);

  function stepTrip(direction: -1 | 1) {
    if (trips.length <= 1) {
      return;
    }

    const nextIndex = (activeTripIndex + direction + trips.length) % trips.length;
    onTripSelect(trips[nextIndex].id);
  }

  function closeReviewPreview() {
    setOpenReviewStamp(null);
  }

  useEffect(() => {
    if (!stampAnimationActive || !newStampStayId || !bookRef.current || !flyoverRef.current || !placeholderRef.current) {
      setFlyoverStyle({});
      return;
    }

    const bookRect = bookRef.current.getBoundingClientRect();
    const flyRect = flyoverRef.current.getBoundingClientRect();
    const targetRect = placeholderRef.current.getBoundingClientRect();

    const bookCenterX = bookRect.left + bookRect.width / 2;
    const bookCenterY = bookRect.top + bookRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const offsetX = targetCenterX - bookCenterX;
    const offsetY = targetCenterY - bookCenterY;
    const scale = targetRect.width / Math.max(flyRect.width, 1);

    setFlyoverStyle({
      "--fly-x": `${offsetX}px`,
      "--fly-y": `${offsetY}px`,
      "--fly-scale": scale.toFixed(3)
    } as CSSProperties);
  }, [activeTrip.id, activeTrip.stamps.length, newStampStayId, stampAnimationActive]);

  return (
    <section className="stampedia-shell">
      <div className="stampedia-top">
        <div className="stampedia-eye">
          <img alt="Atlas logo" className="stampedia-eye-logo" src="/atlas_logo.png" />
          <span className="stampedia-eye-text">{uiCopy.stampediaCapsule}</span>
        </div>
        <div className="stampedia-nav">
          <button className="stampedia-arrow" disabled={trips.length <= 1} onClick={() => stepTrip(-1)} type="button">
            &#8249;
          </button>
          <div className="stampedia-page-count">
            <span>{activeTripIndex + 1}</span>
            <span>/</span>
            <span>{trips.length}</span>
          </div>
          <button className="stampedia-arrow" disabled={trips.length <= 1} onClick={() => stepTrip(1)} type="button">
            &#8250;
          </button>
        </div>
      </div>

        <div className={cx("stampedia-book", turning && "turning", stampAnimationActive && "celebrating")} ref={bookRef}>
        {newestStamp ? (
          <div className={cx("stampedia-flyover", stampAnimationActive && "on")} ref={flyoverRef} style={flyoverStyle}>
            <StampCard flying fresh openReviewLabel={(stamp) => formatUiCopy(uiCopy.openSavedReviewAria, { property: stamp.displayName })} stamp={newestStamp} index={0} />
          </div>
        ) : null}

        <div className="stampedia-page stampedia-page-left">
          <div className="stampedia-margin-doodles left" aria-hidden="true">
            <span className="stampedia-doodle loop" />
            <span className="stampedia-doodle cross" />
            <span className="stampedia-doodle dash" />
          </div>
          <div className="stampedia-sparkles" aria-hidden="true">
            {sparkles.map((sparkle, index) => (
              <span
                className="stampedia-sparkle"
                key={`${activeTrip.id}:${index}`}
                style={{ left: sparkle.left, top: sparkle.top, animationDelay: sparkle.delay }}
              />
            ))}
          </div>

          <div className="stampedia-paper-mark">Atlas Capsule</div>
          <textarea
            className="stampedia-trip-title"
            defaultValue={activeTrip.title}
            key={`${activeTrip.id}-${activeTrip.title}`}
            onBlur={(event) => onTripRename(activeTrip.tripId, event.target.value)}
            rows={2}
          />
          <div className="stampedia-profile">
            <div>
              <div className="stampedia-profile-lbl">
                <span>{formatUiCopy(uiCopy.travelCapsule, { name: customerName })}</span>
                <span className="stampedia-plane" aria-hidden="true">
                  <svg fill="none" viewBox="0 0 24 24">
                    <path d="M21 4 10 14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    <path d="m21 4-7 16-2.6-6.4L5 11l16-7Z" fill="currentColor" />
                  </svg>
                </span>
              </div>
              <div className="stampedia-profile-name">{uiCopy.travelCapsuleSub}</div>
              <div className="stampedia-route" aria-hidden="true">
                <span className="stampedia-route-dot start" />
                <span className="stampedia-route-line" />
                <span className="stampedia-route-dot end" />
                <span className="stampedia-route-plane-wrap">
                  <svg className="stampedia-route-plane" fill="none" viewBox="0 0 24 24">
                    <path d="M21 4 10 14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                    <path d="m21 4-7 16-2.6-6.4L5 11l16-7Z" fill="currentColor" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div className="stampedia-facts">
            <div className="stampedia-fact">
              <span>{uiCopy.dateRange}</span>
              <strong>{activeTrip.dateRange}</strong>
            </div>
            <div className="stampedia-fact">
              <span>{uiCopy.duration}</span>
              <strong>{activeTrip.durationLabel}</strong>
            </div>
            <div className="stampedia-fact">
              <span>{uiCopy.country}</span>
              <strong>{activeTrip.country}</strong>
            </div>
            <div className="stampedia-fact">
              <span>{uiCopy.stamped}</span>
              <strong>
                {activeTrip.collectedCount}/{activeTrip.stampCount}
              </strong>
            </div>
          </div>

          {visibleStamps.length ? <p className="stampedia-note">{journalNote}</p> : null}

          {activeTrip.uploadedPhoto ? (
            <div className="journal-photo-card">
              <div className="journal-photo-tape" />
              <div
                aria-label={activeTrip.uploadedPhoto.alt}
                className="journal-photo-img"
                role="img"
                style={{ backgroundImage: `url("${activeTrip.uploadedPhoto.src}")` }}
              />
              <div className="journal-photo-caption">{activeTrip.uploadedPhoto.caption}</div>
            </div>
          ) : null}
        </div>

        <div className="stampedia-page stampedia-page-right">
          <div className="stampedia-margin-doodles right" aria-hidden="true">
            <span className="stampedia-doodle swirl" />
            <span className="stampedia-doodle star" />
            <span className="stampedia-doodle dash blue" />
          </div>
          <div className="stampedia-twinkles" aria-hidden="true">
            {twinkles.map((twinkle, index) => (
              <span
                className="stampedia-twinkle"
                key={`${activeTrip.id}:twinkle:${index}`}
                style={{ left: twinkle.left, top: twinkle.top, animationDelay: twinkle.delay, width: twinkle.size, height: twinkle.size }}
              />
            ))}
          </div>
          <div className="stampedia-tape-strip" />
          <div className="stampedia-grid">
            {activeTrip.stamps.length ? (
              activeTrip.stamps.map((stamp, index) =>
                stampAnimationActive && stamp.stayId === newStampStayId ? (
                  <div className="stamp-card-placeholder" key={stamp.stayId} ref={placeholderRef}>
                    <StampCard fresh={false} index={index} openReviewLabel={(item) => formatUiCopy(uiCopy.openSavedReviewAria, { property: item.displayName })} stamp={stamp} />
                  </div>
                ) : (
                  <StampCard
                    fresh={stamp.stayId === newStampStayId}
                    index={index}
                    key={stamp.stayId}
                    openReviewLabel={(item) => formatUiCopy(uiCopy.openSavedReviewAria, { property: item.displayName })}
                    onOpenReview={setOpenReviewStamp}
                    stamp={stamp}
                  />
                )
              )
            ) : null}
          </div>
          <div className="stampedia-footer">
            <div className="stampedia-dots">
              {trips.map((trip) => (
                <button
                  className={cx("stampedia-page-dot", trip.id === activeTrip.id && "active")}
                  key={trip.id}
                  onClick={() => onTripSelect(trip.id)}
                  type="button"
                />
              ))}
            </div>
            <div className="stampedia-page-num">{formatUiCopy(uiCopy.stampediaPage, { page: activeTripIndex + 1 })}</div>
          </div>
        </div>
      </div>

      {openReviewStamp ? (
        <div
          className="stamp-review-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeReviewPreview();
            }
          }}
        >
          <div className="stamp-review-card">
            <button
              aria-label={uiCopy.closeReviewPreview}
              className="stamp-review-close"
              onClick={(event) => {
                event.stopPropagation();
                closeReviewPreview();
              }}
              type="button"
            >
              &#10005;
            </button>
            <div className="stamp-review-kicker">{uiCopy.savedReview}</div>
            <h3 className="stamp-review-title">{openReviewStamp.reviewTitle || openReviewStamp.displayName}</h3>
            <div className="stamp-review-meta">
              <span>{[openReviewStamp.city, openReviewStamp.country].filter(Boolean).join(", ")}</span>
              <span>{openReviewStamp.dateLabel}</span>
            </div>
            <p className="stamp-review-body">{openReviewStamp.reviewText}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
