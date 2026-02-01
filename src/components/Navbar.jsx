import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGlobalReducer } from "../hooks/useGlobalReducer";
import Dropdown from "bootstrap/js/dist/dropdown";

export const Navbar = () => {
  const { store, actions } = useGlobalReducer();
  const navigate = useNavigate();

  const btnRef = useRef(null);
  const ddRef = useRef(null);

  useEffect(() => {
    if (!btnRef.current) return;

    ddRef.current = new Dropdown(btnRef.current, { autoClose: true });

    return () => {
      ddRef.current?.dispose?.();
      ddRef.current = null;
    };
  }, []);

  return (
    <nav className="navbar navbar-dark sw-navbar px-3">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 m-0">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/6/6c/Star_Wars_Logo.svg"
            alt="Star Wars"
            className="sw-logo"
          />
        </Link>

        <div className="dropdown">
          <button
            ref={btnRef}
            className="btn btn-warning dropdown-toggle fw-semibold"
            type="button"
            onClick={() => ddRef.current?.toggle()}
          >
            Favorites{" "}
            <span className="badge bg-dark ms-1">{store.favorites.length}</span>
          </button>

          <ul className="dropdown-menu dropdown-menu-end sw-dropdown" style={{ minWidth: 320 }}>
            {store.favorites.length === 0 ? (
              <li className="px-3 py-2 text-muted">No favorites yet.</li>
            ) : (
              store.favorites.map((fav) => (
                <li key={`${fav.type}-${fav.uid}`}>
                  <div className="d-flex align-items-center justify-content-between px-3 py-2 gap-3">
                    <button
                      className="btn btn-link p-0 text-start sw-dropdown-link"
                      onClick={() => navigate(`/details/${fav.type}/${fav.uid}`)}
                    >
                      {fav.name}
                    </button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      aria-label="Delete favorite"
                      onClick={() => actions.removeFavorite(fav.type, fav.uid)}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};
