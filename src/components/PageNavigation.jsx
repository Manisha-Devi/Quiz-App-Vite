import React from "react";
import { NavLink } from "react-router-dom";
import "./styles/PageNavigation.css";

function PageNavigation() {
  return (
    <nav className="page-navigation" aria-label="Main navigation">
      <NavLink to="/" end className="page-navigation-link">
        Upload / Local
      </NavLink>
      <NavLink to="/server-data" className="page-navigation-link">
        Server Data
      </NavLink>
    </nav>
  );
}

export default PageNavigation;
