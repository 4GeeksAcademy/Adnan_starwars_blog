import React, { useEffect } from "react";
import { useGlobalReducer } from "../hooks/useGlobalReducer";
import { EntityRow } from "../components/EntityRow";

export const Home = () => {
  const { store, actions } = useGlobalReducer();

  useEffect(() => {
    actions.loadPeople();
    actions.loadPlanets();
    actions.loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container">
      {store.error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {store.error}
        </div>
      )}

      <EntityRow
        title="Characters"
        type="people"
        items={store.people}
        loading={store.loading.people}
      />

      <EntityRow
        title="Planets"
        type="planets"
        items={store.planets}
        loading={store.loading.planets}
      />

      <EntityRow
        title="Vehicles"
        type="vehicles"
        items={store.vehicles}
        loading={store.loading.vehicles}
      />
    </div>
  );
};
