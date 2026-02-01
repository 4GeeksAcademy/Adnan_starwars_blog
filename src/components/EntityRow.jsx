import React from "react";
import { Link } from "react-router-dom";
import { useGlobalReducer } from "../hooks/useGlobalReducer";
import { getVisualGuideImage } from "../store";

export const EntityRow = ({ title, type, items, loading }) => {
  const { store, actions } = useGlobalReducer();

  const isFav = (uid) => actions.isFavorite(type, uid);

  const safeImgFallback = (e) => {
    // prevent infinite loop if placeholder also fails
    if (e.currentTarget.dataset.fallbackApplied) return;
    e.currentTarget.dataset.fallbackApplied = "true";
    e.currentTarget.src =
      "https://starwars-visualguide.com/assets/img/big-placeholder.jpg";
  };

  return (
    <section className="sw-section mb-5">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="sw-title m-0">{title}</h2>
        {loading && <span className="text-muted">Loading…</span>}
      </div>

      <div className="sw-row d-flex gap-3 overflow-auto pb-3">
        {items.map((item) => {
          const img = getVisualGuideImage(type, item.uid);
          const active = isFav(item.uid);

          return (
            <div key={`${type}-${item.uid}`} className="card sw-card">
             
              <div className="sw-card-imgbox">
                <img
                  src={img}
                  alt={item.name}
                  className="sw-card-img"
                  onError={safeImgFallback}
                  loading="lazy"
                />
              </div>

              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-2">{item.name}</h5>

                <p className="card-text sw-card-text mb-3">
                  Click “Learn more” for details from SWAPI.tech.
                </p>

                <div className="mt-auto d-flex justify-content-between align-items-center">
                  <Link
                    to={`/details/${type}/${item.uid}`}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Learn more!
                  </Link>

                  <button
                    className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-warning"}`}
                    onClick={() => actions.toggleFavorite(type, item.uid, item.name)}
                    title={active ? "Remove favorite" : "Add favorite"}
                  >
                    {active ? "★" : "☆"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
