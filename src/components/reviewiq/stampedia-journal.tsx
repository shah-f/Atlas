"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
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
};

type StampediaJournalProps = {
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
};

function StampOutline() {
  return (
    <svg aria-hidden="true" className="stamp-card-outline" viewBox="0 0 280 360">
      <path
        d="M42 28
        Q 28 40 40 56
        Q 52 72 40 88
        Q 28 104 40 120
        Q 52 136 40 152
        Q 28 168 40 184
        Q 52 200 40 216
        Q 28 232 40 248
        Q 52 264 40 280
        Q 28 296 40 312
        Q 52 328 42 342
        Q 58 330 78 338
        Q 98 346 118 338
        Q 138 330 158 338
        Q 178 346 198 338
        Q 218 330 238 338
        Q 258 346 244 330
        Q 256 314 244 298
        Q 232 282 244 266
        Q 256 250 244 234
        Q 232 218 244 202
        Q 256 186 244 170
        Q 232 154 244 138
        Q 256 122 244 106
        Q 232 90 244 74
        Q 256 58 244 42
        Q 230 26 210 34
        Q 190 42 170 34
        Q 150 26 130 34
        Q 110 42 90 34
        Q 70 26 50 34
        Q 30 42 42 28 Z"
        className="stamp-card-outline-fill"
      />
      <rect className="stamp-card-outline-frame" height="126" rx="16" width="184" x="48" y="54" />
    </svg>
  );
}

function StampCard({ stamp, index, fresh, flying = false }: StampCardProps) {
  const rotation = `${index % 2 === 0 ? -2.8 : 2.6}deg`;
  const style = { "--stamp-rotate": rotation, "--stamp-index": index } as CSSProperties;
  const locationLabel = [stamp.city, stamp.country].filter(Boolean).join(", ");

  return (
    <article className={cx("stamp-card", stamp.collected && "collected", stamp.selected && "selected", fresh && "fresh", flying && "flying")} style={style}>
      <div className="stamp-card-shell">
        <StampOutline />
        <div
          aria-label={stamp.visual.photoAlt ?? `${stamp.displayName} stamp`}
          className="stamp-card-photo-window"
          role="img"
          style={{ background: stamp.visual.tile }}
        >
          <div className="stamp-card-photo-glow" />
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
        <div className="stamp-card-inkring">
          <span>{(stamp.country || stamp.city || "Travel").slice(0, 3).toUpperCase()}</span>
          <span>{stamp.dateLabel}</span>
        </div>
        {fresh ? <span className="stamp-card-new">Fresh</span> : null}
      </div>

      <div className="stamp-card-caption">
        <div className="stamp-card-name">{stamp.displayName}</div>
        <div className="stamp-card-loc">{locationLabel}</div>
        <div className="stamp-card-meta">
          <span>{stamp.dateLabel}</span>
          <span>{stamp.room}</span>
        </div>
      </div>
    </article>
  );
}

export function StampediaJournal({
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
  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? trips[0];

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
    ? `No stamps yet. Submit the first review in ${activeTrip.title} to start this journal.`
    : newestStamp
      ? `${newestStamp.displayName} just slid into your ${activeTrip.title} spread.`
      : `${activeTrip.collectedCount} stamp${activeTrip.collectedCount === 1 ? "" : "s"} collected for ${activeTrip.country}.`;

  function stepTrip(direction: -1 | 1) {
    if (trips.length <= 1) {
      return;
    }

    const nextIndex = (activeTripIndex + direction + trips.length) % trips.length;
    onTripSelect(trips[nextIndex].id);
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
        <div className="stampedia-eye">Stampedia</div>
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
            <StampCard flying fresh stamp={newestStamp} index={0} />
          </div>
        ) : null}

        <div className="stampedia-page stampedia-page-left">
          <div className="stampedia-paper-mark">Stampedia</div>
          <textarea
            className="stampedia-trip-title"
            defaultValue={activeTrip.title}
            key={`${activeTrip.id}-${activeTrip.title}`}
            onBlur={(event) => onTripRename(activeTrip.tripId, event.target.value)}
            rows={2}
          />
          <div className="stampedia-profile">
            <div className="stampedia-avatar">S</div>
            <div>
              <div className="stampedia-profile-lbl">Traveler capsule</div>
              <div className="stampedia-profile-name">Reviewed stays, saved as keepsakes</div>
            </div>
          </div>

          <div className="stampedia-facts">
            <div className="stampedia-fact">
              <span>Date range</span>
              <strong>{activeTrip.dateRange}</strong>
            </div>
            <div className="stampedia-fact">
              <span>Duration</span>
              <strong>{activeTrip.durationLabel}</strong>
            </div>
            <div className="stampedia-fact">
              <span>Country</span>
              <strong>{activeTrip.country}</strong>
            </div>
            <div className="stampedia-fact">
              <span>Stamped</span>
              <strong>
                {activeTrip.collectedCount}/{activeTrip.stampCount}
              </strong>
            </div>
          </div>

          {visibleStamps.length ? <p className="stampedia-note">{journalNote}</p> : null}

          <div className="stampedia-progress-strip">
            {visibleStamps.map((stamp) => (
                <button
                  className={cx("stampedia-dot", stamp.collected && "collected", stamp.stayId === newStampStayId && "fresh")}
                  key={stamp.stayId}
                  onClick={() => onTripSelect(activeTrip.id)}
                  type="button"
                >
                {stamp.displayName.slice(0, 1).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="stampedia-page stampedia-page-right">
          <div className="stampedia-postmark">
            <span>{activeTrip.country.toUpperCase()}</span>
            <span>STAMPEDIA</span>
          </div>
          <div className="stampedia-grid">
            {activeTrip.stamps.length ? (
              activeTrip.stamps.map((stamp, index) =>
                stampAnimationActive && stamp.stayId === newStampStayId ? (
                  <div className="stamp-card-placeholder" key={stamp.stayId} ref={placeholderRef}>
                    <StampCard fresh={false} index={index} stamp={stamp} />
                  </div>
                ) : (
                  <StampCard fresh={stamp.stayId === newStampStayId} index={index} key={stamp.stayId} stamp={stamp} />
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
            <div className="stampedia-page-num">Page {activeTripIndex + 1}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
