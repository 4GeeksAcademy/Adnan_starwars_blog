import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGlobalReducer } from "../hooks/useGlobalReducer";
import { getVisualGuideImage } from "../store";

export const Single = () => {
  const { type, uid } = useParams();
  const { store, actions } = useGlobalReducer();
  const [detail, setDetail] = useState(null);

  const nameFromList = useMemo(() => {
    const list = store[type] || [];
    const found = list.find((x) => x.uid === uid);
    return found?.name || "";
  }, [store, type, uid]);

  useEffect(() => {
    let active = true;
    (async () => {
      const d = await actions.getDetails(type, uid);
      if (active) setDetail(d);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, uid]);

  const safeImgFallback = (e) => {
    if (e.currentTarget.dataset.fallbackApplied) return;
    e.currentTarget.dataset.fallbackApplied = "true";
    e.currentTarget.src =
      "https://starwars-visualguide.com/assets/img/big-placeholder.jpg";
  };

  if (!detail) {
    return (
      <div className="container">
        <div className="alert alert-info">Loading details…</div>
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          ← Back
        </Link>
      </div>
    );
  }

  const props = detail.properties || {};
  const displayName = props.name || nameFromList || "Unknown";
  const img = getVisualGuideImage(type, uid);

  const subtitle =
    type === "people"
      ? "A person within the Star Wars universe."
      : type === "planets"
      ? "A planet within the Star Wars universe."
      : "A vehicle within the Star Wars universe.";

  return (
    <div className="container">
      <div className="mb-3">
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          ← Back
        </Link>
      </div>

      {/* Top hero section (image left, text right) */}
      <div className="row g-4 align-items-start mb-4">
        <div className="col-12 col-lg-5">
          <div className="sw-detail-imgbox">
            <img
              src={img}
              alt={displayName}
              className="sw-detail-img"
              onError={safeImgFallback}
            />
          </div>

          <div className="sw-demo-text mt-3">
            <h5 className="mb-2">Description</h5>
            <p className="mb-0">
              This page shows details pulled from SWAPI.tech. The image is loaded from
              Star Wars Visual Guide. Some fields are URLs because that’s how SWAPI links related resources.
            </p>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <h1 className="sw-detail-title mb-1">{displayName}</h1>
          <p className="sw-detail-subtitle mb-3">{subtitle}</p>

          <button
            className="btn btn-warning fw-semibold mb-4"
            onClick={() => actions.toggleFavorite(type, uid, displayName)}
          >
            Add/Remove Favorite
          </button>

          <hr className="sw-hr" />

          <h2 className="h5 sw-title mb-3">Details</h2>

          <div className="row">
            {Object.entries(props).map(([key, value]) => (
              <div className="col-12 col-md-6 mb-3" key={key}>
                <div className="sw-detail-card">
                  <div className="sw-detail-key">{key.replaceAll("_", " ")}</div>
                  <div className="sw-detail-val">{String(value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
