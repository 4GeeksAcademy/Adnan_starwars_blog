const SWAPI_BASE = "https://www.swapi.tech/api";

// Visual Guide image rules (works well for the project)
export const getVisualGuideImage = (type, uid) => {
  const map = {
    people: "characters",
    planets: "planets",
    vehicles: "vehicles"
  };
  const folder = map[type] || type;
  return `https://starwars-visualguide.com/assets/img/${folder}/${uid}.jpg`;
};

const persist = (store) => {
  try {
    localStorage.setItem("sw_store_v1", JSON.stringify(store));
  } catch (e) {
    // ignore
  }
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
  if (saved) return saved;

  return {
    people: [],
    planets: [],
    vehicles: [],
    favorites: [], // [{ type, uid, name }]

    // cache details so you don't refetch repeatedly
    details: {
      people: {},
      planets: {},
      vehicles: {}
    },

    loading: {
      people: false,
      planets: false,
      vehicles: false,
      details: false
    },
    error: null
  };
};

export const actions = (getStore, setStore) => {
  const save = () => persist(getStore());

  const fetchList = async (type) => {
    const store = getStore();

    // If already loaded (from localStorage), don't refetch
    if (Array.isArray(store[type]) && store[type].length > 0) return;

    setStore({
      ...store,
      loading: { ...store.loading, [type]: true },
      error: null
    });

    try {
      const resp = await fetch(`${SWAPI_BASE}/${type}`);
      if (!resp.ok) throw new Error(`Failed fetching ${type}`);

      const data = await resp.json();

      const results = (data?.results || []).map((item) => ({
        type,
        uid: item.uid,
        name: item.name,
        url: item.url
      }));

      const next = {
        ...getStore(),
        [type]: results,
        loading: { ...getStore().loading, [type]: false }
      };
      setStore(next);
      save();
    } catch (e) {
      const next = {
        ...getStore(),
        loading: { ...getStore().loading, [type]: false },
        error: String(e?.message || e)
      };
      setStore(next);
      save();
    }
  };

  const fetchDetails = async (type, uid) => {
    const store = getStore();
    const cached = store.details?.[type]?.[uid];
    if (cached) return cached;

    setStore({
      ...store,
      loading: { ...store.loading, details: true },
      error: null
    });

    try {
      const resp = await fetch(`${SWAPI_BASE}/${type}/${uid}`);
      if (!resp.ok) throw new Error(`Failed fetching ${type} ${uid}`);

      const data = await resp.json();
      const result = data?.result;

      const detail = {
        uid: result?.uid || uid,
        description: result?.description || "",
        properties: result?.properties || {}
      };

      const next = {
        ...getStore(),
        details: {
          ...getStore().details,
          [type]: {
            ...(getStore().details?.[type] || {}),
            [uid]: detail
          }
        },
        loading: { ...getStore().loading, details: false }
      };

      setStore(next);
      save();
      return detail;
    } catch (e) {
      const next = {
        ...getStore(),
        loading: { ...getStore().loading, details: false },
        error: String(e?.message || e)
      };
      setStore(next);
      save();
      return null;
    }
  };

  const isFavorite = (type, uid) => {
    const store = getStore();
    return store.favorites.some((f) => f.type === type && f.uid === uid);
  };

  const addFavorite = (fav) => {
    const store = getStore();
    const exists = store.favorites.some(
      (f) => f.type === fav.type && f.uid === fav.uid
    );
    if (exists) return;

    const next = { ...store, favorites: [...store.favorites, fav] };
    setStore(next);
    save();
  };

  const removeFavorite = (type, uid) => {
    const store = getStore();
    const next = {
      ...store,
      favorites: store.favorites.filter((f) => !(f.type === type && f.uid === uid))
    };
    setStore(next);
    save();
  };

  const toggleFavorite = (type, uid, name) => {
    if (isFavorite(type, uid)) removeFavorite(type, uid);
    else addFavorite({ type, uid, name });
  };

  return {
    loadPeople: () => fetchList("people"),
    loadPlanets: () => fetchList("planets"),
    loadVehicles: () => fetchList("vehicles"),

    getDetails: (type, uid) => fetchDetails(type, uid),

    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite
  };
};
