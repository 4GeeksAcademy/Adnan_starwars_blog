import React from "react";
import { createBrowserRouter } from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "demo", element: <Demo /> },
      { path: "details/:type/:uid", element: <Single /> },

      // Fallback
      { path: "*", element: <Home /> }
    ]
  }
]);
