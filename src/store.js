const SWAPI_BASE = "https://www.swapi.tech/api";

const BACKEND_BASE = "https://super-space-acorn-x5rrjrxw4p9jf975p-3000.app.github.dev"
  .replace(/\/$/, "");

const USER_ID = 1;

const SYNC_SWAPI_TO_BACKEND = true;


export const getVisualGuideImage = (type, uid) => {
  const map = { people: "characters", planets: "planets", vehicles: "vehicles" };
  const folder = map[type] || type;
  return `https://starwars-visualguide.com/assets/img/${folder}/${uid}.jpg`;
};


const persist = (store) => {
  try {
    const favs = Array.isArray(store.favorites) ? store.favorites : [];
    const vehiclesFavs = favs.filter((f) => f.type === "vehicles");

    const toSave = {
      people: store.people,
      planets: store.planets,
      vehicles: store.vehicles,
      favorites: vehiclesFavs,
      details: store.details
    };
    localStorage.setItem("sw_store_v1", JSON.stringify(toSave));
  } catch (e) {}
};

const loadPersisted = () => {
  try {
    const raw = localStorage.getItem("sw_store_v1");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const initialStore = () => {
  const saved = loadPersisted();

  const base = {
    people: [],
    planets: [],
    vehicles: [],
    favorites: [], // [{ type, uid, name }]
    details: { people: {}, planets: {}, vehicles: {} },
    loading: { people: false, planets: false, vehicles: false, details: false, favorites: false, syncing: false },
    error: null
  };

  if (!saved) return base;

  const savedFavs = Array.isArray(saved.favorites) ? saved.favorites : [];
  const vehiclesFavs = savedFavs.filter((f) => f.type === "vehicles");

  return {
    ...base,
    ...saved,
    favorites: vehiclesFavs,
    loading: { ...base.loading }
  };
};

// Backend mapping for favorites endpoints
const toBackendType = (frontType) => {
  if (frontType === "planets") return "planet";
  if (frontType === "people") return "people";
  return null; // vehicles not supported in backend favorites
};

const fromBackendType = (backendType) => {
  if (backendType === "planet") return "planets";
  if (backendType === "people") return "people";
  return null;
};

const backendFetch = (path, options) => {
  const opts = options || {};
  const headers = opts.headers || {};
  return fetch(`${BACKEND_BASE}${path}`, {
    ...opts,
    headers: { ...headers, "X-User-Id": String(USER_ID) }
  });
};

// ---- Sync SWAPI list items into backend tables 
const syncListToBackend = async (type, items) => {
  if (!SYNC_SWAPI_TO_BACKEND) return;

  const endpoint = type === "people" ? "/people" : type === "planets" ? "/planets" : null;
  if (!endpoint) return;

  if (!Array.isArray(items) || items.length === 0) return;

  // Sequential loop avoids spamming too hard
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const resp = await fetch(`${BACKEND_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: String(it.uid), name: it.name })
      });

      // 201 Created: OK
      // 409 Exists: OK
      // 200 OK: OK (if your backend behaves like upsert)
      if (!(resp.status === 201 || resp.status === 200 || resp.status === 409)) {
        // Optional debug:
        // const txt = await resp.text();
        // console.warn("Sync failed:", endpoint, it.uid, resp.status, txt);
      }
    } catch (e) {
      // ignore individual sync errors
    }
  }
};
// ---------------------------------------------------------------

export const actions = (getStore, setStore) => {
  const save = () => persist(getStore());

  const setError = (err) => {
    const msg = err && err.message ? err.message : String(err);
    setStore({ ...getStore(), error: msg });
  };

  const fetchList = async (type) => {
    const store = getStore();

    // ✅ KEY FIX:
    // If list is already loaded from localStorage, still sync it into backend once.
    if (Array.isArray(store[type]) && store[type].length > 0) {
      try {
        setStore({ ...store, loading: { ...store.loading, syncing: true } });
        await syncListToBackend(type, store[type]);
      } finally {
        setStore({ ...getStore(), loading: { ...getStore().loading, syncing: false } });
      }
      return;
    }

    setStore({ ...store, loading: { ...store.loading, [type]: true }, error: null });

    try {
      const resp = await fetch(`${SWAPI_BASE}/${type}`);
      if (!resp.ok) throw new Error(`Failed fetching ${type}`);

      const data = await resp.json();
      const resultsRaw = data && data.results ? data.results : [];
      const results = resultsRaw.map((item) => ({
        type,
        uid: item.uid,
        name: item.name,
        url: item.url
      }));

      setStore({ ...getStore(), [type]: results, loading: { ...getStore().loading, [type]: false } });
      save();

      // Sync newly fetched people/planets into backend
      setStore({ ...getStore(), loading: { ...getStore().loading, syncing: true } });
      await syncListToBackend(type, results);
      setStore({ ...getStore(), loading: { ...getStore().loading, syncing: false } });
    } catch (e) {
      setStore({ ...getStore(), loading: { ...getStore().loading, [type]: false, syncing: false } });
      setError(e);
      save();
    }
  };

  const fetchDetails = async (type, uid) => {
    const store = getStore();
    const typeCache = store.details && store.details[type] ? store.details[type] : null;
    if (typeCache && typeCache[uid]) return typeCache[uid];

    setStore({ ...store, loading: { ...store.loading, details: true }, error: null });

    try {
      const resp = await fetch(`${SWAPI_BASE}/${type}/${uid}`);
      if (!resp.ok) throw new Error(`Failed fetching ${type} ${uid}`);

      const data = await resp.json();
      const result = data ? data.result : null;

      const detail = {
        uid: result && result.uid ? result.uid : uid,
        description: result && result.description ? result.description : "",
        properties: result && result.properties ? result.properties : {}
      };

      const nextDetails = {
        ...getStore().details,
        [type]: {
          ...(getStore().details && getStore().details[type] ? getStore().details[type] : {}),
          [uid]: detail
        }
      };

      setStore({ ...getStore(), details: nextDetails, loading: { ...getStore().loading, details: false } });
      save();
      return detail;
    } catch (e) {
      setStore({ ...getStore(), loading: { ...getStore().loading, details: false } });
      setError(e);
      save();
      return null;
    }
  };

  // ---- Favorites (backend for people/planets) ----
  const loadFavorites = async () => {
    const store = getStore();
    setStore({ ...store, loading: { ...store.loading, favorites: true }, error: null });

    try {
      const resp = await backendFetch("/users/favorites");
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Favorites load failed (${resp.status}): ${txt}`);
      }

      const data = await resp.json();
      const serverFavsRaw = Array.isArray(data) ? data : [];

      const serverFavs = serverFavsRaw
        .map((f) => {
          const frontType = fromBackendType(f.type);
          if (!frontType) return null;
          return { type: frontType, uid: String(f.uid), name: f.name || "" };
        })
        .filter(Boolean);

      const localVehiclesFavs = (store.favorites || []).filter((f) => f.type === "vehicles");

      // merge + dedupe
      const merged = localVehiclesFavs.concat(serverFavs).filter((fav, idx, arr) => {
        for (let i = 0; i < idx; i++) {
          if (arr[i].type === fav.type && arr[i].uid === fav.uid) return false;
        }
        return true;
      });

      setStore({ ...getStore(), favorites: merged, loading: { ...getStore().loading, favorites: false } });
      save();
    } catch (e) {
      setStore({ ...getStore(), loading: { ...getStore().loading, favorites: false } });
      setError(e);
    }
  };

  const isFavorite = (type, uid) => {
    const store = getStore();
    const favs = Array.isArray(store.favorites) ? store.favorites : [];
    return favs.some((f) => f.type === type && f.uid === uid);
  };

  const addFavorite = async (fav) => {
    const store = getStore();

    // vehicles -> local only
    if (fav.type === "vehicles") {
      const favs = Array.isArray(store.favorites) ? store.favorites : [];
      const exists = favs.some((f) => f.type === fav.type && f.uid === fav.uid);
      if (exists) return;
      setStore({ ...store, favorites: favs.concat([fav]) });
      save();
      return;
    }

    // people/planets -> backend
    const backendType = toBackendType(fav.type);
    if (!backendType) return;

    try {
      const resp = await backendFetch(`/favorite/${backendType}/${fav.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fav.name })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Add favorite failed (${resp.status}): ${txt}`);
      }
      await loadFavorites();
    } catch (e) {
      setError(e);
    }
  };

  const removeFavorite = async (type, uid) => {
    const store = getStore();

    // vehicles -> local only
    if (type === "vehicles") {
      const favs = Array.isArray(store.favorites) ? store.favorites : [];
      setStore({ ...store, favorites: favs.filter((f) => !(f.type === type && f.uid === uid)) });
      save();
      return;
    }

    const backendType = toBackendType(type);
    if (!backendType) return;

    try {
      const resp = await backendFetch(`/favorite/${backendType}/${uid}`, { method: "DELETE" });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Remove favorite failed (${resp.status}): ${txt}`);
      }
      await loadFavorites();
    } catch (e) {
      setError(e);
    }
  };

  const toggleFavorite = async (type, uid, name) => {
    if (isFavorite(type, uid)) return removeFavorite(type, uid);
    return addFavorite({ type, uid, name });
  };

 
  const syncCachedPeoplePlanets = async () => {
    const store = getStore();
    setStore({ ...store, loading: { ...store.loading, syncing: true } });
    try {
      await syncListToBackend("people", store.people);
      await syncListToBackend("planets", store.planets);
    } finally {
      setStore({ ...getStore(), loading: { ...getStore().loading, syncing: false } });
    }
  };

  return {
    loadPeople: () => fetchList("people"),
    loadPlanets: () => fetchList("planets"),
    loadVehicles: () => fetchList("vehicles"),

    getDetails: (type, uid) => fetchDetails(type, uid),

    loadFavorites,

    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,

 
    syncCachedPeoplePlanets
  };
};
